import type { FastifyPluginAsync } from 'fastify';
import { SealDetailQuerySchema } from '@convocart/contracts';
import { getSealByCode } from '../services/deal.service.js';
import { sealPublicKey } from '../services/seal-proof.js';

export const sealRoutes: FastifyPluginAsync = async (app) => {
  // Handshake's seal-signing public key, so anyone can check a seal's signature themselves (DHRUMIL-T22).
  app.get('/api/seals/key', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.status(200).send({ publicKey: sealPublicKey(), alg: 'Ed25519' });
  });

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

