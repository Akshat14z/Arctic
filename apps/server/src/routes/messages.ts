import type { FastifyPluginAsync } from 'fastify';
import { PrepareMessageRequestSchema } from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import { prepareMessage } from '../services/message-prepare.service.js';

export const messageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/messages/prepare
   * Authenticated endpoint to translate draft message into recipient languages
   * and evaluate Meaning Guard / Tone Guard rules before client sends it via Nexconn Web SDK.
   */
  app.post(
    '/api/messages/prepare',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = PrepareMessageRequestSchema.parse(request.body);
      const result = await prepareMessage(request.user!.id, parsedBody);
      return reply.status(200).send(result);
    }
  );
};

