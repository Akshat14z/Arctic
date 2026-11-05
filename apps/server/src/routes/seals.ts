import type { FastifyPluginAsync } from 'fastify';
import { SealDetailQuerySchema } from '@convocart/contracts';
import { getSealByCode } from '../services/deal.service.js';

export const sealRoutes: FastifyPluginAsync = async (app) => {
  // Public, unauthenticated verification of a sealed deal
  app.get<{ Params: { code: string }; Querystring: { lang?: string } }>(
    '/api/seals/:code',
    async (request, reply) => {
      const { code } = request.params;
      const parsedQuery = SealDetailQuerySchema.safeParse(request.query);
      const lang = parsedQuery.success ? parsedQuery.data.lang : undefined;

      const sealData = await getSealByCode(code, lang);
      return reply.status(200).send(sealData);
    }
  );
};

