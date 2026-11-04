import type { FastifyPluginAsync } from 'fastify';
import {
  GuestAuthRequestSchema,
  AgentAuthRequestSchema,
} from '@convocart/contracts';
import { loginGuest, loginAgent } from '../services/auth.service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/auth/guest
  app.post('/api/auth/guest', async (request, reply) => {
    const parsedBody = GuestAuthRequestSchema.parse(request.body);
    const response = await loginGuest(parsedBody);
    return reply.status(201).send(response);
  });

  // POST /api/auth/agent
  app.post('/api/auth/agent', async (request, reply) => {
    const parsedBody = AgentAuthRequestSchema.parse(request.body);
    const response = await loginAgent(parsedBody);
    return reply.status(201).send(response);
  });
};
