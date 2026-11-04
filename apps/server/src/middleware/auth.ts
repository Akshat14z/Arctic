import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from '@convocart/contracts';
import { validateSession } from '../services/auth.service.js';
import { AppError } from '../errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    sessionToken?: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401, false);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AppError('UNAUTHORIZED', 'Session token is empty', 401, false);
  }

  const user = await validateSession(token);
  request.user = user;
  request.sessionToken = token;
}
