import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { ApiErrorResponse } from '@convocart/contracts';
import { getConfig } from './config.js';
import { errorHandler } from './errors.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();

  const app = fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.NODE_ENV === 'production' ? 'info' : 'debug',
          },
  });

  // 1. Cross-Origin Resource Sharing (CORS)
  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true,
  });

  // 2. Centralized Error Handler (conforming to C1)
  app.setErrorHandler(errorHandler);

  // 3. Centralized 404 Not Found Handler (conforming to C1)
  app.setNotFoundHandler((request, reply) => {
    const payload: ApiErrorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        retryable: false,
      },
    };
    reply.status(404).send(payload);
  });

  // 4. Register Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);

  return app;
}
