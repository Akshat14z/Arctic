import type { FastifyPluginAsync } from 'fastify';
import { UpdateMeRequestSchema } from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import { getMe, updateMe } from '../services/auth.service.js';

export const meRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/me
  app.get(
    '/api/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const response = await getMe(request.user!.id);
      return reply.status(200).send(response);
    }
  );

  // PATCH /api/me
  app.patch(
    '/api/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = UpdateMeRequestSchema.parse(request.body);
      const response = await updateMe(request.user!.id, parsedBody);
      return reply.status(200).send(response);
    }
  );
};
