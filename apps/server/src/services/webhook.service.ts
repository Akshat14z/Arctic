import type { LangCode, ShownToDetail } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { analyzeMessageGuard } from './guard.service.js';

export interface NexconnWebhookPayload {
  event?: string;
  messageId?: string;
  msgId?: string;
  fromUserId?: string;
  targetId?: string;
  channelId?: string;
  channelType?: number | string;
  msgTimestamp?: number | string;
  timestamp?: number | string;
  content?: string | {
    text?: string;
    extra?: string | Record<string, unknown>;
  };
  extra?: string | Record<string, unknown>;
}

export interface WebhookProcessingResult {
  received: boolean;
  duplicate?: boolean;
  stored?: boolean;
  scamWarning?: boolean;
}

/**
 * Consumes single-use webhook nonce and enforces anti-replay window.
 */
export async function consumeWebhookNonce(nonce: string): Promise<void> {
  const existing = await prisma.webhookNonce.findUnique({
    where: { nonce },
  });

  if (existing) {
    throw new AppError('REPLAY_ATTACK_DETECTED', 'Webhook nonce has already been consumed', 409, false);
  }

  await prisma.webhookNonce.create({
    data: {
      nonce,
      receivedAt: new Date(),
    },
  });

  // Asynchronously prune expired nonces (older than 10 mins)
  prisma.webhookNonce
    .deleteMany({
      where: {
        receivedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
    })
    .catch(() => {});
}

/**
 * Ingests a verified Nexconn webhook message event, computes the "Show me what they saw"
 * rendering records for every participant, executes Scam Shield checks, and records the transcript line.
 */
export async function processNexconnMessageEvent(
  payload: NexconnWebhookPayload
): Promise<WebhookProcessingResult> {
  const nexconnMessageId = payload.messageId || payload.msgId;
  if (!nexconnMessageId) {
    throw new AppError('VALIDATION_ERROR', 'Missing messageId in webhook payload', 400, false);
  }

  // 1. Check for duplicate delivery (idempotency on nexconnMessageId)
  const existingLine = await prisma.transcriptLine.findUnique({
    where: { nexconnMessageId },
  });

  if (existingLine) {
    return { received: true, duplicate: true, stored: false };
  }

  // 2. Resolve target channel
  const targetChannelId = payload.channelId || payload.targetId;
  if (!targetChannelId) {
    throw new AppError('VALIDATION_ERROR', 'Missing channelId or targetId in webhook payload', 400, false);
  }

  // Resolve chat conversation or case group
  let chat = await prisma.chat.findUnique({
    where: { channelId: targetChannelId },
    include: {
      buyer: true,
      seller: true,
    },
  });

  let caseRecord = null;
  if (!chat) {
    // Check if target is a case group channel
    caseRecord = await prisma.case.findFirst({
      where: { groupChannelId: targetChannelId },
      include: {
        chat: {
          include: { buyer: true, seller: true },
        },
        buyer: true,
        seller: true,
        agent: true,
      },
    });

    if (caseRecord) {
      chat = caseRecord.chat;
    }
  }

  // If chat row not found, cannot associate with participants
  if (!chat) {
    console.warn(`[Webhook] Message received for unknown conversation: ${targetChannelId}`);
    return { received: true, stored: false };
  }

  // 3. Extract text and HandshakeExtraV1 metadata
  let messageText = '';
  let extraObj: any = null;

  if (typeof payload.content === 'string') {
    messageText = payload.content;
    try {
      const parsed = JSON.parse(payload.content);
      if (parsed && typeof parsed === 'object') {
        if (parsed.text) messageText = parsed.text;
        if (parsed.extra) extraObj = parsed.extra;
      }
    } catch {
      // plain text string
    }
  } else if (payload.content && typeof payload.content === 'object') {
    messageText = payload.content.text || '';
    extraObj = payload.content.extra;
  }

  if (!extraObj && payload.extra) {
    extraObj = payload.extra;
  }

  if (typeof extraObj === 'string') {
    try {
      extraObj = JSON.parse(extraObj);
    } catch {
      extraObj = null;
    }
  }

  const fromUserId = payload.fromUserId || chat.buyerId;
  const origLang: LangCode = (extraObj?.orig?.lang as LangCode) || 'en';
  const origText = extraObj?.orig?.text || messageText;
  const tr: Record<LangCode, string> = extraObj?.tr || {};

  // 4. Compute "Show Me What They Saw" (D-022) per participant
  // The C4 render rule:
  // - Sender sees original text in their language without toggle
  // - Recipient sees tr[myLang] if available, otherwise origText
  const participants = [chat.buyer, chat.seller];
  if (caseRecord?.agent) {
    participants.push(caseRecord.agent);
  }

  const shownTo: Record<string, ShownToDetail> = {};
  for (const member of participants) {
    if (member.id === fromUserId) {
      shownTo[member.id] = {
        lang: origLang,
        text: origText,
        translated: false,
      };
    } else {
      const memberLang = member.language as LangCode;
      if (tr[memberLang]) {
        shownTo[member.id] = {
          lang: memberLang,
          text: tr[memberLang],
          translated: true,
        };
      } else {
        shownTo[member.id] = {
          lang: origLang,
          text: origText,
          translated: false,
        };
      }
    }
  }

  // 5. Scam Shield check in Webhook (ARCHITECTURE §4.5)
  const guard = analyzeMessageGuard(origText, origLang);
  const scamDetected = guard.issues.some((i) => i.kind === 'scam_signal');

  // 6. Record line in transcript_lines
  const rawTimestamp = payload.msgTimestamp || payload.timestamp || Date.now();
  const atDate = new Date(typeof rawTimestamp === 'number' ? rawTimestamp : parseInt(rawTimestamp, 10));

  await prisma.transcriptLine.create({
    data: {
      nexconnMessageId,
      channelId: chat.channelId,
      at: isNaN(atDate.getTime()) ? new Date() : atDate,
      fromId: fromUserId,
      origLang,
      origText,
      tr,
      shownTo: shownTo as any,
    },
  });

  return {
    received: true,
    stored: true,
    scamWarning: scamDetected,
  };
}

