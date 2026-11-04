import type { FastifyPluginAsync } from 'fastify';
import { ChatCreateRequestSchema } from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import {
  createOrGetChat,
  getChats,
  getChatById,
} from '../services/chat.service.js';

export const chatRoutes: FastifyPluginAsync = async (app) => {
  // 1. POST /api/chats (Authenticated - Create or Get Conversation)
  app.post(
    '/api/chats',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = ChatCreateRequestSchema.parse(request.body);
      const chat = await createOrGetChat(request.user!.id, parsedBody);
      return reply.status(200).send(chat);
    }
  );

  // 2. GET /api/chats (Authenticated - Inbox View)
  app.get(
    '/api/chats',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await getChats(request.user!.id);
      return reply.status(200).send(result);
    }
  );

  // 3. GET /api/chats/:id (Authenticated - Conversation Detail)
  app.get<{ Params: { id: string } }>(
    '/api/chats/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const chat = await getChatById(id, request.user!.id, request.user!.role);
      return reply.status(200).send(chat);
    }
  );
};

