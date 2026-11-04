import type { FastifyPluginAsync } from 'fastify';
import {
  ListingCreateRequestSchema,
  ListingUpdateRequestSchema,
  ListingListQuerySchema,
  ListingDetailQuerySchema,
} from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} from '../services/listing.service.js';

export const listingRoutes: FastifyPluginAsync = async (app) => {
  // 1. POST /api/listings (Authenticated)
  app.post(
    '/api/listings',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = ListingCreateRequestSchema.parse(request.body);
      const listing = await createListing(request.user!.id, parsedBody);
      return reply.status(201).send({ listing });
    }
  );

  // 2. GET /api/listings (Public)
  app.get('/api/listings', async (request, reply) => {
    const parsedQuery = ListingListQuerySchema.parse(request.query);
    const result = await getListings(parsedQuery);
    return reply.status(200).send(result);
  });

  // 3. GET /api/listings/:id (Public, translated read)
  app.get<{ Params: { id: string } }>('/api/listings/:id', async (request, reply) => {
    const { id } = request.params;
    const parsedQuery = ListingDetailQuerySchema.parse(request.query);
    const listing = await getListingById(id, parsedQuery.lang);
    return reply.status(200).send({ listing });
  });

  // 4. PATCH /api/listings/:id (Authenticated, ownership-enforced)
  app.patch<{ Params: { id: string } }>(
    '/api/listings/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const parsedBody = ListingUpdateRequestSchema.parse(request.body);
      const listing = await updateListing(id, request.user!.id, parsedBody);
      return reply.status(200).send({ listing });
    }
  );

  // 5. DELETE /api/listings/:id (Authenticated, ownership-enforced)
  app.delete<{ Params: { id: string } }>(
    '/api/listings/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const result = await deleteListing(id, request.user!.id);
      return reply.status(200).send(result);
    }
  );
};

