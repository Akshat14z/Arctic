import type { FastifyPluginAsync } from 'fastify';
import { getConfig } from '../config.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    const config = getConfig();

    return reply.status(200).send({
      status: 'ok',
      service: 'convocart-server',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: config.NODE_ENV,
    });
  });
};
