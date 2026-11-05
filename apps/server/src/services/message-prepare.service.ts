import type {
  PrepareMessageRequest,
  PreparedMessage,
  HandshakeExtraV1,
  LangCode,
} from '@convocart/contracts';
import { PreparedMessageSchema } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { analyzeMessageGuard } from './guard.service.js';
import { translateForRecipients } from './translation.service.js';

/**
 * Prepares a draft message for transmission across languages.
 * Translates message into every channel recipient's preferred language (D-021)
 * and runs Meaning Guard & Tone Guard (D-024) checks before transmission.
 *
 * NOTE: This function NEVER dispatches the message via Nexconn or saves transcript lines.
 * The frontend client transmits the message directly via the Nexconn Web SDK after user review.
 */
export async function prepareMessage(
  senderId: string,
  input: PrepareMessageRequest
): Promise<PreparedMessage> {
  // 1. Look up the chat conversation and its participants
  const chat = await prisma.chat.findUnique({
    where: { channelId: input.channelId },
    include: {
      buyer: true,
      seller: true,
    },
  });

  if (!chat) {
    throw new AppError('CHAT_NOT_FOUND', `Chat conversation '${input.channelId}' not found`, 404, false);
  }

  // 2. Enforce participant authorization
  const isBuyer = chat.buyerId === senderId;
  const isSeller = chat.sellerId === senderId;

  if (!isBuyer && !isSeller) {
    throw new AppError('FORBIDDEN', 'You are not an authorized participant in this conversation', 403, false);
  }

  // 3. Resolve recipient languages across the channel (D-021: Three languages, one room)
  // In a direct chat, the recipient is the other party.
  const otherMembers = [chat.buyer, chat.seller].filter((m) => m.id !== senderId);
  const recipientLangs: LangCode[] = otherMembers.map((m) => m.language as LangCode);

  // If no other members or sender matches, default to sender's own language
  if (recipientLangs.length === 0) {
    recipientLangs.push(input.senderLang);
  }

  // 4. Translate into all recipient languages in parallel
  const tr = await translateForRecipients(input.text, input.senderLang, recipientLangs);

  // 5. Run Meaning Guard and Tone Guard analysis
  const guardResult = analyzeMessageGuard(input.text, input.senderLang);

  // 6. Build HandshakeExtraV1 payload conforming to C4
  const extra: HandshakeExtraV1 = {
    v: 1,
    kind: 'text',
    orig: {
      lang: input.senderLang,
      text: input.text,
    },
    tr,
    guard: {
      issues: guardResult.issues,
      acknowledged: false,
    },
  };

  // 7. Assemble final PreparedMessage response
  const prepared: PreparedMessage = {
    messageText: input.text,
    extra,
    guard: {
      issues: guardResult.issues,
      blocking: guardResult.blocking,
    },
  };

  // Validate output against contracts schema
  return PreparedMessageSchema.parse(prepared);
}

