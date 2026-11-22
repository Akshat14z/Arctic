import type { FastifyPluginAsync } from 'fastify';
import {
  FollowListQuerySchema,
  FollowPreferencesUpdateSchema,
  FollowingFeedQuerySchema,
  SellerSearchQuerySchema,
} from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import {
  followSeller,
  getFollowStatus,
  getFollowingFeed,
  getSellerStorefront,
  listFollowers,
  listFollowing,
  searchSellers,
  unfollowSeller,
  updateFollowPreferences,
} from '../services/social-commerce.service.js';
import { listNotifications, markNotificationRead } from '../services/notification.service.js';
import { getWatchlistStatus, listWatchlist, removeSavedListing, saveListing } from '../services/watchlist.service.js';

export const socialCommerceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/sellers/search', { preHandler: [authenticate] }, async (request, reply) => {
    const query = SellerSearchQuerySchema.parse(request.query);
    return reply.send(await searchSellers(request.user!.id, query));
  });

  app.get('/api/sellers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = FollowListQuerySchema.parse(request.query);
    return reply.send(await getSellerStorefront(id, query));
  });

  app.get('/api/sellers/:id/followers', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await listFollowers(id, FollowListQuerySchema.parse(request.query)));
  });

  app.get('/api/sellers/:id/following', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await listFollowing(id, FollowListQuerySchema.parse(request.query)));
  });

  app.get('/api/sellers/:id/follow-status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await getFollowStatus(request.user!.id, id));
  });

  app.post('/api/sellers/:id/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await followSeller(request.user!.id, id));
  });

  app.delete('/api/sellers/:id/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await unfollowSeller(request.user!.id, id));
  });

  app.patch('/api/sellers/:id/follow-preferences', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = FollowPreferencesUpdateSchema.parse(request.body);
    return reply.send(await updateFollowPreferences(request.user!.id, id, body));
  });

  app.get('/api/following/feed', { preHandler: [authenticate] }, async (request, reply) => {
    return reply.send(await getFollowingFeed(request.user!.id, FollowingFeedQuerySchema.parse(request.query)));
  });

  app.get('/api/notifications', { preHandler: [authenticate] }, async (request, reply) => {
    const query = FollowListQuerySchema.parse(request.query);
    return reply.send(await listNotifications(request.user!.id, query.cursor, query.limit));
  });

  app.patch('/api/notifications/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await markNotificationRead(request.user!.id, id);
    return reply.send({ success: true });
  });

  app.get('/api/watchlist', { preHandler: [authenticate] }, async (request, reply) => {
    return reply.send(await listWatchlist(request.user!.id, FollowListQuerySchema.parse(request.query)));
  });
  app.get('/api/watchlist/:listingId/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };
    return reply.send(await getWatchlistStatus(request.user!.id, listingId));
  });
  app.post('/api/watchlist/:listingId', { preHandler: [authenticate] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };
    return reply.send(await saveListing(request.user!.id, listingId));
  });
  app.delete('/api/watchlist/:listingId', { preHandler: [authenticate] }, async (request, reply) => {
    const { listingId } = request.params as { listingId: string };
    return reply.send(await removeSavedListing(request.user!.id, listingId));
  });
};
