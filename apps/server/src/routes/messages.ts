import type { FastifyPluginAsync } from 'fastify';
import {
  PrepareMessageRequestSchema,
  TranscribeAudioRequestSchema,
} from '@convocart/contracts';
import { authenticate } from '../middleware/auth.js';
import { prepareMessage } from '../services/message-prepare.service.js';
import { transcribeAudio, getVoiceClip } from '../services/voice.service.js';

export const messageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/messages/prepare
   * Authenticated endpoint to translate draft message into recipient languages
   * and evaluate Meaning Guard / Tone Guard rules before client sends it via Nexconn Web SDK.
   */
  app.post(
    '/api/messages/prepare',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const parsedBody = PrepareMessageRequestSchema.parse(request.body);
      const result = await prepareMessage(request.user!.id, parsedBody);
      return reply.status(200).send(result);
    }
  );

  /**
   * POST /api/messages/transcribe
   * Authenticated endpoint to transcribe voice memo audio using Gemini
   */
  app.post(
    '/api/messages/transcribe',
    {
      preHandler: [authenticate],
      bodyLimit: 5 * 1024 * 1024, // base64 of up to 3 MB of audio
    },
    async (request, reply) => {
      const parsedBody = TranscribeAudioRequestSchema.parse(request.body);
      const result = await transcribeAudio(parsedBody);
      return reply.status(200).send(result);
    }
  );

  /**
   * GET /api/audio/:id
   * Public playback endpoint for uploaded voice memo audio files.
   * Supports HTTP 206 Partial Content for range-based seeking across all browsers (Safari, Chrome, Firefox).
   */
  app.get('/api/audio/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = /^[0-9a-f-]{36}$/i.test(id) ? await getVoiceClip(id) : null;
    if (!record) {
      return reply.status(404).send({ error: 'Audio file not found' });
    }
    const buffer = Buffer.from(record.data);

    const total = buffer.length;
    const rangeHeader = request.headers.range;

    reply.header('Accept-Ranges', 'bytes');
    reply.header('Content-Type', record.mimeType);
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.header('Access-Control-Allow-Origin', '*');

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      if (start >= total || end >= total) {
        reply.status(416);
        reply.header('Content-Range', `bytes */${total}`);
        return reply.send();
      }

      const chunkSize = end - start + 1;
      reply.status(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${total}`);
      reply.header('Content-Length', chunkSize);
      return reply.send(buffer.subarray(start, end + 1));
    }

    reply.status(200);
    reply.header('Content-Length', total);
    return reply.send(buffer);
  });
};
