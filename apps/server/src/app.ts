import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { ApiErrorResponse } from '@convocart/contracts';
import { getConfig } from './config.js';
import { errorHandler } from './errors.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { listingRoutes } from './routes/listings.js';
import { chatRoutes } from './routes/chats.js';
import { messageRoutes } from './routes/messages.js';
import { caseRoutes } from './routes/cases.js';
import { webhookRoutes } from './routes/webhooks.js';
import { dealRoutes } from './routes/deals.js';
import { sealRoutes } from './routes/seals.js';
import { demoRoutes } from './routes/demo.js';

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

  // 1. Cross-Origin Resource Sharing (CORS) - supports single or comma-separated origins
  const origins = config.WEB_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: origins.length === 1 ? origins[0] : origins,
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
  await app.register(listingRoutes);
  await app.register(chatRoutes);
  await app.register(messageRoutes);
  await app.register(caseRoutes);
  await app.register(webhookRoutes);
  await app.register(dealRoutes);
  await app.register(sealRoutes);
  await app.register(demoRoutes);

  return app;
}
