import type { FastifyPluginAsync } from 'fastify';
import {
  CreateCaseRequestSchema,
  ResolveCaseRequestSchema,
} from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import {
  createOrGetCase,
  getAgentQueue,
  claimCase,
  resolveCase,
  getCaseDetail,
} from '../services/case.service.js';

export const caseRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/cases
   * Authenticated user opens support dispute on a conversation.
   * Idempotent: returns existing active case if already open.
   */
  app.post(
    '/api/cases',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = CreateCaseRequestSchema.parse(request.body);
      const caseItem = await createOrGetCase(request.user!.id, parsedBody);
      return reply.status(200).send({ case: caseItem });
    }
  );

  /**
   * GET /api/agent/queue
   * Support agent retrieves queue of open/claimed cases, prioritized by SLA.
   */
  app.get(
    '/api/agent/queue',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await getAgentQueue(request.user!);
      return reply.status(200).send(result);
    }
  );

  /**
   * POST /api/cases/:id/claim
   * Agent claims an open dispute case. 409 if already claimed by someone else.
   */
  app.post<{ Params: { id: string } }>(
    '/api/cases/:id/claim',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const caseItem = await claimCase(id, request.user!);
      return reply.status(200).send({ case: caseItem });
    }
  );

  /**
   * POST /api/cases/:id/resolve
   * Claiming agent resolves the case with a resolution note.
   */
  app.post<{ Params: { id: string } }>(
    '/api/cases/:id/resolve',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const parsedBody = ResolveCaseRequestSchema.parse(request.body);
      const caseItem = await resolveCase(id, request.user!, parsedBody.resolution);
      return reply.status(200).send({ case: caseItem });
    }
  );

  /**
   * GET /api/cases/:id
   * Retrieves case detail, transcript history, and dispute summary.
   * Allowed for buyer, seller, or any support agent.
   */
  app.get<{ Params: { id: string } }>(
    '/api/cases/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const detail = await getCaseDetail(id, request.user!);
      return reply.status(200).send(detail);
    }
  );
};

