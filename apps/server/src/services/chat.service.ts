import type {
  ChatCreateRequest,
  ChatCreateResponse,
  ChatListResponse,
  ChatDetailResponse,
  ChatSummary,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { formatUser } from './auth.service.js';
import { formatListing } from './listing.service.js';
import { AppError } from '../errors.js';

export function generateDirectChannelId(buyerId: string, listingId: string): string {
  return `ch_${buyerId}_${listingId}`;
}

export async function createOrGetChat(
  buyerId: string,
  input: ChatCreateRequest
): Promise<ChatCreateResponse> {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: {
      seller: true,
      translations: true,
    },
  });

  if (!listing) {
    throw new AppError('LISTING_NOT_FOUND', `Listing with ID ${input.listingId} not found`, 404, false);
  }

  // Prevent buyer from chatting with themselves on their own listing
  if (listing.sellerId === buyerId) {
    throw new AppError('CANNOT_CHAT_WITH_SELF', 'You cannot start a conversation with yourself', 400, false);
  }

  // 1. Check for existing conversation (Idempotency)
  const existing = await prisma.chat.findUnique({
    where: {
      buyerId_listingId: {
        buyerId,
        listingId: listing.id,
      },
    },
    include: {
      seller: true,
      listing: {
        include: { seller: true, translations: true },
      },
    },
  });

  if (existing) {
    return {
      channelId: existing.channelId,
      channelType: 'direct',
      seller: formatUser(existing.seller),
      listing: formatListing(existing.listing),
    };
  }

  // 2. Create new chat conversation with deterministic channel ID
  const channelId = generateDirectChannelId(buyerId, listing.id);

  try {
    const created = await prisma.chat.create({
      data: {
        channelId,
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
      },
      include: {
        seller: true,
        listing: {
          include: { seller: true, translations: true },
        },
      },
    });

    return {
      channelId: created.channelId,
      channelType: 'direct',
      seller: formatUser(created.seller),
      listing: formatListing(created.listing),
    };
  } catch (err: any) {
    // Handle concurrent creation race condition gracefully
    if (err.code === 'P2002') {
      const fallback = await prisma.chat.findUniqueOrThrow({
        where: {
          buyerId_listingId: {
            buyerId,
            listingId: listing.id,
          },
        },
        include: {
          seller: true,
          listing: {
            include: { seller: true, translations: true },
          },
        },
      });
      return {
        channelId: fallback.channelId,
        channelType: 'direct',
        seller: formatUser(fallback.seller),
        listing: formatListing(fallback.listing),
      };
    }
    throw err;
  }
}

export async function getChats(currentUserId: string): Promise<ChatListResponse> {
  const chats = await prisma.chat.findMany({
    where: {
      OR: [
        { buyerId: currentUserId },
        { sellerId: currentUserId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: true,
      seller: true,
      listing: {
        include: { seller: true, translations: true },
      },
      transcriptLines: {
        orderBy: { at: 'desc' },
        take: 1,
      },
    },
  });

  const items: ChatSummary[] = chats.map((chat) => {
    const isBuyer = chat.buyerId === currentUserId;
    const otherUser = isBuyer ? chat.seller : chat.buyer;
    const lastTranscript = chat.transcriptLines[0];

    return {
      channelId: chat.channelId,
      listing: formatListing(chat.listing),
      otherUser: formatUser(otherUser),
      lastMessage: lastTranscript
        ? {
            text: lastTranscript.origText,
            at: lastTranscript.at.toISOString(),
          }
        : undefined,
      unreadCount: 0,
    };
  });

  return { items };
}

export async function getChatById(
  channelId: string,
  currentUserId: string,
  currentUserRole: string
): Promise<ChatDetailResponse> {
  const chat = await prisma.chat.findUnique({
    where: { channelId },
    include: {
      buyer: true,
      seller: true,
      listing: {
        include: { seller: true, translations: true },
      },
    },
  });

  if (!chat) {
    throw new AppError('CHAT_NOT_FOUND', `Conversation with ID ${channelId} not found`, 404, false);
  }

  // Authorization check: User must be buyer, seller, or support agent
  const isParticipant =
    chat.buyerId === currentUserId ||
    chat.sellerId === currentUserId ||
    currentUserRole === 'agent';

  if (!isParticipant) {
    throw new AppError('FORBIDDEN', 'You are not authorized to view this conversation', 403, false);
  }

  return {
    channelId: chat.channelId,
    channelType: 'direct',
    listingId: chat.listingId,
    buyerId: chat.buyerId,
    sellerId: chat.sellerId,
    buyer: formatUser(chat.buyer),
    seller: formatUser(chat.seller),
    listing: formatListing(chat.listing),
    createdAt: chat.createdAt.toISOString(),
  };
}

