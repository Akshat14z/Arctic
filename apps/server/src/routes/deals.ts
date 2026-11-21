import type { FastifyPluginAsync } from 'fastify';
import {
  ExtractDealRequestSchema,
  CreateOfferRequestSchema,
} from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import { extractDeal, agreeToDeal, createOffer, rejectDeal } from '../services/deal.service.js';

export const dealRoutes: FastifyPluginAsync = async (app) => {
  // Extract or generate a Deal proposal from chat context
  app.post(
    '/api/deals/extract',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsed = ExtractDealRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues.map((i) => i.message).join(', '),
            retryable: false,
          },
        });
      }

      const deal = await extractDeal(parsed.data.channelId, request.user!.id);
      return reply.status(200).send({ deal });
    }
  );

  // Create explicit offer with mandatory price and optional note
  app.post(
    '/api/deals/create',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsed = CreateOfferRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues.map((i) => i.message).join(', '),
            retryable: false,
          },
        });
      }

      const deal = await createOffer(parsed.data.channelId, request.user!.id, {
        priceAmount: parsed.data.priceAmount,
        currency: parsed.data.currency,
        message: parsed.data.message,
        deliveryMethod: parsed.data.deliveryMethod,
      });
      return reply.status(201).send({ deal });
    }
  );

  // Agree to a deal proposal (mutual agreement / handshake)
  app.post<{ Params: { id: string } }>(
    '/api/deals/:id/agree',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const dealId = request.params.id;
      if (!dealId) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Deal ID is required',
            retryable: false,
          },
        });
      }

      const deal = await agreeToDeal(dealId, request.user!.id);
      return reply.status(200).send({ deal });
    }
  );

  // Reject / decline a deal proposal
  app.post<{ Params: { id: string } }>(
    '/api/deals/:id/reject',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const dealId = request.params.id;
      if (!dealId) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Deal ID is required',
            retryable: false,
          },
        });
      }

      const deal = await rejectDeal(dealId, request.user!.id);
      return reply.status(200).send({ deal });
    }
  );
};
