import { z } from 'zod';
import { LangCodeSchema, MoneySchema } from './c1-conventions.js';
import { UserSchema } from './c2-identity.js';

export const NotificationFrequencySchema = z.enum(['instant', 'daily', 'off']);
export type NotificationFrequency = z.infer<typeof NotificationFrequencySchema>;

export const FollowPreferencesSchema = z.object({
  notifyNewListings: z.boolean(),
  notifyPriceChanges: z.boolean(),
  notificationFrequency: NotificationFrequencySchema,
});
export type FollowPreferences = z.infer<typeof FollowPreferencesSchema>;

export const FollowStatusResponseSchema = z.object({
  sellerId: z.string().min(1),
  isFollowing: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  preferences: FollowPreferencesSchema.optional(),
});
export type FollowStatusResponse = z.infer<typeof FollowStatusResponseSchema>;

export const FollowPreferencesUpdateSchema = FollowPreferencesSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one preference is required'
);
export type FollowPreferencesUpdate = z.infer<typeof FollowPreferencesUpdateSchema>;

export const FollowListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FollowListQuery = z.infer<typeof FollowListQuerySchema>;

export const FollowListItemSchema = z.object({
  user: UserSchema.extend({
    avatarUrl: z.string().url().optional(),
    isVerified: z.boolean(),
  }),
  followedAt: z.string().datetime(),
});

export const FollowListResponseSchema = z.object({
  items: z.array(FollowListItemSchema),
  nextCursor: z.string().optional(),
});
export type FollowListResponse = z.infer<typeof FollowListResponseSchema>;

export const PublicSellerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  language: LangCodeSchema,
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  businessDescription: z.string().optional(),
  isVerified: z.boolean(),
  isDemo: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  activeListingCount: z.number().int().nonnegative(),
  categories: z.array(z.string()),
  trustScore: z.number().min(0).max(100).nullable(),
  genuineReviewCount: z.number().int().nonnegative(),
});
export type PublicSeller = z.infer<typeof PublicSellerSchema>;

export const SellerSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type SellerSearchQuery = z.infer<typeof SellerSearchQuerySchema>;

export const SellerSearchItemSchema = PublicSellerSchema.pick({
  id: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  isVerified: true,
  followerCount: true,
  activeListingCount: true,
});

export const SellerSearchResponseSchema = z.object({
  items: z.array(SellerSearchItemSchema),
});
export type SellerSearchResponse = z.infer<typeof SellerSearchResponseSchema>;

export const StorefrontListingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  price: MoneySchema,
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const SellerStorefrontResponseSchema = z.object({
  seller: PublicSellerSchema,
  listings: z.array(StorefrontListingSchema),
  nextCursor: z.string().optional(),
});
export type SellerStorefrontResponse = z.infer<typeof SellerStorefrontResponseSchema>;

export const FollowingFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  lang: LangCodeSchema.optional(),
});
export type FollowingFeedQuery = z.infer<typeof FollowingFeedQuerySchema>;

export const FollowingFeedItemSchema = z.object({
  listing: StorefrontListingSchema,
  seller: PublicSellerSchema.pick({ id: true, displayName: true, avatarUrl: true, isVerified: true }),
  publishedAt: z.string().datetime(),
});

export const FollowingFeedResponseSchema = z.object({
  items: z.array(FollowingFeedItemSchema),
  nextCursor: z.string().optional(),
});
export type FollowingFeedResponse = z.infer<typeof FollowingFeedResponseSchema>;

export const NotificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['new_listing', 'price_change']),
  sellerId: z.string().min(1),
  listingId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().optional(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const SocialActionResponseSchema = z.object({ success: z.literal(true) });

export const WatchlistStatusResponseSchema = z.object({
  listingId: z.string().min(1),
  saved: z.boolean(),
  notifyPriceChanges: z.boolean(),
});
export type WatchlistStatusResponse = z.infer<typeof WatchlistStatusResponseSchema>;

export const WatchlistResponseSchema = z.object({
  items: z.array(StorefrontListingSchema.extend({
    seller: PublicSellerSchema.pick({ id: true, displayName: true, avatarUrl: true, isVerified: true }),
    savedAt: z.string().datetime(),
  })),
  nextCursor: z.string().optional(),
});
export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>;
