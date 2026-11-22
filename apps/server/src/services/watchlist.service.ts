import type { FollowListQuery, WatchlistResponse, WatchlistStatusResponse } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';

export async function getWatchlistStatus(userId: string, listingId: string): Promise<WatchlistStatusResponse> {
  const item = await prisma.watchlistItem.findUnique({ where: { userId_listingId: { userId, listingId } } });
  return { listingId, saved: Boolean(item), notifyPriceChanges: item?.notifyPriceChanges ?? true };
}

export async function saveListing(userId: string, listingId: string): Promise<WatchlistStatusResponse> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!listing) throw new AppError('LISTING_NOT_FOUND', 'Listing not found', 404, false);
  if (listing.sellerId === userId) throw new AppError('OWN_LISTING', 'You cannot save your own listing', 400, false);
  await prisma.watchlistItem.upsert({ where: { userId_listingId: { userId, listingId } }, create: { userId, listingId }, update: {} });
  return getWatchlistStatus(userId, listingId);
}

export async function removeSavedListing(userId: string, listingId: string): Promise<WatchlistStatusResponse> {
  await prisma.watchlistItem.deleteMany({ where: { userId, listingId } });
  return getWatchlistStatus(userId, listingId);
}

export async function listWatchlist(userId: string, query: FollowListQuery): Promise<WatchlistResponse> {
  const rows = await prisma.watchlistItem.findMany({
    where: { userId, listing: { isActive: true } },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { userId_listingId: { userId, listingId: query.cursor } }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' }, { listingId: 'asc' }],
    include: { listing: { include: { seller: true } } },
  });
  const page = rows.slice(0, query.limit);
  return {
    items: page.map(({ listing, createdAt }) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: { amount: listing.priceAmount, currency: listing.priceCurrency as 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' },
      imageUrl: listing.imageUrl || undefined,
      category: listing.category || undefined,
      createdAt: listing.createdAt.toISOString(),
      seller: { id: listing.seller.id, displayName: listing.seller.displayName, avatarUrl: listing.seller.avatarUrl || undefined, isVerified: listing.seller.isVerified },
      savedAt: createdAt.toISOString(),
    })),
    nextCursor: rows.length > query.limit ? page.at(-1)?.listingId : undefined,
  };
}
