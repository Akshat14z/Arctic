import type { FastifyPluginAsync } from 'fastify';
import {
  GuestAuthRequestSchema,
  AgentAuthRequestSchema,
  SignupRequestSchema,
  SigninRequestSchema,
} from '@convocart/contracts';
import { loginGuest, loginAgent, signup, signin } from '../services/auth.service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/auth/guest
  app.post('/api/auth/guest', async (request, reply) => {
    const parsedBody = GuestAuthRequestSchema.parse(request.body);
    const response = await loginGuest(parsedBody);
    return reply.status(201).send(response);
  });

  // POST /api/auth/signup: a new account, or (with a guest's Bearer token) that guest upgraded to an account
  app.post('/api/auth/signup', async (request, reply) => {
    const body = SignupRequestSchema.parse(request.body);
    const auth = request.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    return reply.status(201).send(await signup(body, token));
  });

  // POST /api/auth/signin
  app.post('/api/auth/signin', async (request, reply) => {
    const body = SigninRequestSchema.parse(request.body);
    return reply.status(200).send(await signin(body));
  });

  // POST /api/auth/agent
  app.post('/api/auth/agent', async (request, reply) => {
    const parsedBody = AgentAuthRequestSchema.parse(request.body);
    const response = await loginAgent(parsedBody);
    return reply.status(201).send(response);
  });
};

