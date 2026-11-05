import type { FastifyPluginAsync } from 'fastify';
import { ExtractDealRequestSchema } from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import { extractDeal, agreeToDeal } from '../services/deal.service.js';

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
};
