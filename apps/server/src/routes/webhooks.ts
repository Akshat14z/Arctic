import type { FastifyPluginAsync } from 'fastify';
import { getConfig } from '../config.js';
import { verifyNexconnWebhookSignature } from '../nexconn/webhook.js';
import {
  consumeWebhookNonce,
  processNexconnMessageEvent,
  NexconnWebhookPayload,
} from '../services/webhook.service.js';
import { AppError } from '../errors.js';

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/webhooks/nexconn
   * Ingests real-time events from Nexconn.
   * Enforces signature verification, anti-replay time windows, and single-use nonces.
   */
  app.post(
    '/api/webhooks/nexconn',
    async (request, reply) => {
      const config = getConfig();

      const signature =
        (request.headers['signature'] as string) ||
        (request.headers['Signature'] as string);
      const nonce =
        (request.headers['nonce'] as string) ||
        (request.headers['Nonce'] as string);
      const timestamp =
        (request.headers['timestamp'] as string) ||
        (request.headers['Timestamp'] as string);

      // Verify webhook signature when secret is configured or in production
      if (config.NEXCONN_APP_SECRET) {
        const isValid = verifyNexconnWebhookSignature(
          { signature, nonce, timestamp },
          config.NEXCONN_APP_SECRET
        );

        if (!isValid) {
          throw new AppError(
            'WEBHOOK_VERIFICATION_FAILED',
            'Invalid webhook signature or timestamp window expired',
            401,
            false
          );
        }
      }

      // Enforce anti-replay nonce protection if nonce is provided
      if (nonce) {
        await consumeWebhookNonce(nonce);
      }

      const payload = request.body as NexconnWebhookPayload;
      const result = await processNexconnMessageEvent(payload);

      return reply.status(200).send({
        success: true,
        ...result,
      });
    }
  );
};

