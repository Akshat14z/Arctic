import type { NotificationListResponse } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';

type ListingEvent = {
  sellerId: string;
  listingId: string;
  listingTitle: string;
  priceAmount?: number;
  priceCurrency?: string;
};

export async function notifyNewListing(event: ListingEvent): Promise<void> {
  const follows = await prisma.sellerFollow.findMany({
    where: { followingId: event.sellerId, notifyNewListings: true, notificationFrequency: { not: 'off' } },
  });
  if (follows.length === 0) return;
  await prisma.notification.createMany({
    data: follows.map((follow) => ({
      recipientId: follow.followerId,
      type: 'new_listing',
      sellerId: event.sellerId,
      listingId: event.listingId,
      title: 'New listing',
      body: event.listingTitle,
      frequency: follow.notificationFrequency,
      dedupeKey: `${follow.followerId}:listing:${event.listingId}:published`,
    })),
    skipDuplicates: true,
  });
}

export async function notifyPriceChange(event: Required<ListingEvent>): Promise<void> {
  const [follows, watched] = await prisma.$transaction([
    prisma.sellerFollow.findMany({ where: { followingId: event.sellerId, notifyPriceChanges: true, notificationFrequency: { not: 'off' } } }),
    prisma.watchlistItem.findMany({ where: { listingId: event.listingId, notifyPriceChanges: true } }),
  ]);
  const recipients = new Map<string, string>();
  for (const follow of follows) recipients.set(follow.followerId, follow.notificationFrequency);
  for (const item of watched) if (!recipients.has(item.userId)) recipients.set(item.userId, 'instant');
  if (recipients.size === 0) return;
  const value = `${event.priceCurrency} ${event.priceAmount}`;
  await prisma.notification.createMany({
    data: [...recipients].map(([recipientId, frequency]) => ({
      recipientId,
      type: 'price_change',
      sellerId: event.sellerId,
      listingId: event.listingId,
      title: 'Price changed',
      body: `${event.listingTitle}: ${value}`,
      frequency,
      // Source-neutral key: a future Watchlist notifier must use the same key and cannot duplicate this event.
      dedupeKey: `${recipientId}:listing:${event.listingId}:price:${event.priceCurrency}:${event.priceAmount}`,
    })),
    skipDuplicates: true,
  });
}

export async function listNotifications(userId: string, cursor?: string, limit = 20): Promise<NotificationListResponse> {
  const [rows, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { recipientId: userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    prisma.notification.count({ where: { recipientId: userId, readAt: null } }),
  ]);
  const page = rows.slice(0, limit);
  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type as 'new_listing' | 'price_change',
      sellerId: row.sellerId,
      listingId: row.listingId,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? page.at(-1)?.id : undefined,
    unreadCount,
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { readAt: new Date() },
  });
  if (result.count === 0) throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification not found', 404, false);
}
