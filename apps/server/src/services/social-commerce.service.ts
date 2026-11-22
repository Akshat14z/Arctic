import type {
  FollowListQuery,
  FollowListResponse,
  FollowPreferencesUpdate,
  FollowStatusResponse,
  FollowingFeedQuery,
  FollowingFeedResponse,
  SellerStorefrontResponse,
  SellerSearchQuery,
  SellerSearchResponse,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { formatUser } from './auth.service.js';

const storefrontListing = (listing: {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  imageUrl: string | null;
  category: string | null;
  createdAt: Date;
}) => ({
  id: listing.id,
  title: listing.title,
  description: listing.description,
  price: { amount: listing.priceAmount, currency: listing.priceCurrency as 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' },
  imageUrl: listing.imageUrl || undefined,
  category: listing.category || undefined,
  createdAt: listing.createdAt.toISOString(),
});

async function ensurePublicSeller(sellerId: string) {
  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  if (!seller || seller.role !== 'user') {
    throw new AppError('SELLER_NOT_FOUND', 'Seller not found', 404, false);
  }
  return seller;
}

export async function searchSellers(
  viewerId: string,
  query: SellerSearchQuery
): Promise<SellerSearchResponse> {
  const sellers = await prisma.user.findMany({
    where: {
      role: 'user',
      id: { not: viewerId },
      OR: [
        { displayName: { contains: query.q, mode: 'insensitive' } },
        { bio: { contains: query.q, mode: 'insensitive' } },
        { businessDescription: { contains: query.q, mode: 'insensitive' } },
      ],
    },
    take: query.limit,
    orderBy: [{ isVerified: 'desc' }, { displayName: 'asc' }],
    include: {
      _count: {
        select: {
          followers: true,
          listings: { where: { isActive: true } },
        },
      },
    },
  });

  return {
    items: sellers.map((seller) => ({
      id: seller.id,
      displayName: seller.displayName,
      avatarUrl: seller.avatarUrl || undefined,
      bio: seller.bio || undefined,
      isVerified: seller.isVerified,
      followerCount: seller._count.followers,
      activeListingCount: seller._count.listings,
    })),
  };
}

export async function getFollowStatus(viewerId: string, sellerId: string): Promise<FollowStatusResponse> {
  await ensurePublicSeller(sellerId);
  const [relationship, followerCount, followingCount] = await prisma.$transaction([
    prisma.sellerFollow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: sellerId } } }),
    prisma.sellerFollow.count({ where: { followingId: sellerId } }),
    prisma.sellerFollow.count({ where: { followerId: sellerId } }),
  ]);
  return {
    sellerId,
    isFollowing: Boolean(relationship),
    followerCount,
    followingCount,
    ...(relationship
      ? {
          preferences: {
            notifyNewListings: relationship.notifyNewListings,
            notifyPriceChanges: relationship.notifyPriceChanges,
            notificationFrequency: relationship.notificationFrequency as 'instant' | 'daily' | 'off',
          },
        }
      : {}),
  };
}

export async function followSeller(followerId: string, sellerId: string): Promise<FollowStatusResponse> {
  if (followerId === sellerId) throw new AppError('SELF_FOLLOW', 'You cannot follow yourself', 400, false);
  await ensurePublicSeller(sellerId);
  await prisma.sellerFollow.upsert({
    where: { followerId_followingId: { followerId, followingId: sellerId } },
    create: { followerId, followingId: sellerId },
    update: {},
  });
  return getFollowStatus(followerId, sellerId);
}

export async function unfollowSeller(followerId: string, sellerId: string): Promise<FollowStatusResponse> {
  await ensurePublicSeller(sellerId);
  await prisma.sellerFollow.deleteMany({ where: { followerId, followingId: sellerId } });
  return getFollowStatus(followerId, sellerId);
}

export async function updateFollowPreferences(
  followerId: string,
  sellerId: string,
  input: FollowPreferencesUpdate
): Promise<FollowStatusResponse> {
  const result = await prisma.sellerFollow.updateMany({
    where: { followerId, followingId: sellerId },
    data: input,
  });
  if (result.count === 0) throw new AppError('FOLLOW_NOT_FOUND', 'Follow this seller before changing notifications', 404, false);
  return getFollowStatus(followerId, sellerId);
}

export async function listFollowers(sellerId: string, query: FollowListQuery): Promise<FollowListResponse> {
  await ensurePublicSeller(sellerId);
  const rows = await prisma.sellerFollow.findMany({
    where: { followingId: sellerId },
    take: query.limit + 1,
    ...(query.cursor
      ? { cursor: { followerId_followingId: { followerId: query.cursor, followingId: sellerId } }, skip: 1 }
      : {}),
    orderBy: [{ createdAt: 'desc' }, { followerId: 'asc' }],
    include: { follower: true },
  });
  const page = rows.slice(0, query.limit);
  return {
    items: page.map((row) => ({
      user: { ...formatUser(row.follower), avatarUrl: row.follower.avatarUrl || undefined, isVerified: row.follower.isVerified },
      followedAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > query.limit ? page.at(-1)?.followerId : undefined,
  };
}

export async function listFollowing(userId: string, query: FollowListQuery): Promise<FollowListResponse> {
  await ensurePublicSeller(userId);
  const rows = await prisma.sellerFollow.findMany({
    where: { followerId: userId },
    take: query.limit + 1,
    ...(query.cursor
      ? { cursor: { followerId_followingId: { followerId: userId, followingId: query.cursor } }, skip: 1 }
      : {}),
    orderBy: [{ createdAt: 'desc' }, { followingId: 'asc' }],
    include: { following: true },
  });
  const page = rows.slice(0, query.limit);
  return {
    items: page.map((row) => ({
      user: { ...formatUser(row.following), avatarUrl: row.following.avatarUrl || undefined, isVerified: row.following.isVerified },
      followedAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > query.limit ? page.at(-1)?.followingId : undefined,
  };
}

export async function getSellerStorefront(sellerId: string, query: FollowListQuery): Promise<SellerStorefrontResponse> {
  const seller = await ensurePublicSeller(sellerId);
  const [followerCount, followingCount, activeListingCount, categories, rows] = await prisma.$transaction([
    prisma.sellerFollow.count({ where: { followingId: sellerId } }),
    prisma.sellerFollow.count({ where: { followerId: sellerId } }),
    prisma.listing.count({ where: { sellerId, isActive: true } }),
    prisma.listing.findMany({ where: { sellerId, isActive: true, category: { not: null } }, distinct: ['category'], select: { category: true } }),
    prisma.listing.findMany({
      where: { sellerId, isActive: true },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
  ]);
  const page = rows.slice(0, query.limit);
  return {
    seller: {
      id: seller.id,
      displayName: seller.displayName,
      language: seller.language as SellerStorefrontResponse['seller']['language'],
      avatarUrl: seller.avatarUrl || undefined,
      bio: seller.bio || undefined,
      businessDescription: seller.businessDescription || undefined,
      isVerified: seller.isVerified,
      isDemo: seller.isDemo,
      followerCount,
      followingCount,
      activeListingCount,
      categories: categories.flatMap(({ category }) => (category ? [category] : [])),
      trustScore: null,
      genuineReviewCount: 0,
    },
    listings: page.map(storefrontListing),
    nextCursor: rows.length > query.limit ? page.at(-1)?.id : undefined,
  };
}

export async function getFollowingFeed(userId: string, query: FollowingFeedQuery): Promise<FollowingFeedResponse> {
  const rows = await prisma.listing.findMany({
    where: { isActive: true, seller: { followers: { some: { followerId: userId } } } },
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: { seller: true, translations: true },
  });
  const page = rows.slice(0, query.limit);
  return {
    items: page.map((row) => {
      const translated = query.lang ? row.translations.find((item) => item.lang === query.lang) : undefined;
      const listing = storefrontListing({
        ...row,
        title: translated?.title ?? row.title,
        description: translated?.description ?? row.description,
      });
      return {
        listing,
        seller: {
          id: row.seller.id,
          displayName: row.seller.displayName,
          avatarUrl: row.seller.avatarUrl || undefined,
          isVerified: row.seller.isVerified,
        },
        publishedAt: row.createdAt.toISOString(),
      };
    }),
    nextCursor: rows.length > query.limit ? page.at(-1)?.id : undefined,
  };
}
