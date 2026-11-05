import type { FastifyPluginAsync } from 'fastify';
import { DemoSessionRequestSchema } from '@convocart/contracts';
import { createDemoSession } from '../services/demo.service.js';

export const demoRoutes: FastifyPluginAsync = async (app) => {
  // Judge sandbox fast demo login (D-015)
  app.post('/api/demo/session', async (request, reply) => {
    const parsed = DemoSessionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          retryable: false,
        },
      });
    }

    const authResponse = await createDemoSession(parsed.data.as);
    return reply.status(200).send(authResponse);
  });
};

