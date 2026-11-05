import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { getConfig, resetConfigForTesting } from '../src/config.js';
import { verifyNexconnWebhookSignature } from '../src/nexconn/webhook.js';
import { prisma } from '../src/db/prisma.js';

describe('Nexconn Webhooks & Transcript Audit (AKSHAT-T08)', { timeout: 35000 }, () => {
  let app: FastifyInstance;
  const testSecret = 'test_webhook_app_secret_12345';

  function makeWebhookHeaders(nonce: string, timestamp: string) {
    const secret = getConfig().NEXCONN_APP_SECRET || '';
    const signature = createHash('sha1').update(`${secret}${nonce}${timestamp}`).digest('hex');
    return { nonce, timestamp, signature };
  }

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_token_for_webhooks');
  });

  describe('Signature Verification Algorithm', () => {
    it('verifies valid SHA-1 signature with current timestamp', () => {
      const now = Date.now();
      const nonce = 'random_nonce_123';
      const timestamp = String(now);
      const signature = createHash('sha1')
        .update(`${testSecret}${nonce}${timestamp}`, 'utf8')
        .digest('hex');

      const isValid = verifyNexconnWebhookSignature(
        { signature, nonce, timestamp },
        testSecret,
        now
      );

      expect(isValid).toBe(true);
    });

    it('rejects tampered signature', () => {
      const now = Date.now();
      const nonce = 'random_nonce_123';
      const timestamp = String(now);
      const signature = 'bad_forged_signature_00000000000000000000';

      const isValid = verifyNexconnWebhookSignature(
        { signature, nonce, timestamp },
        testSecret,
        now
      );

      expect(isValid).toBe(false);
    });

    it('rejects timestamp outside the ±5 minute time window (anti-replay)', () => {
      const now = Date.now();
      const oldTimestamp = String(now - 10 * 60 * 1000); // 10 minutes ago
      const nonce = 'expired_nonce_123';
      const signature = createHash('sha1')
        .update(`${testSecret}${nonce}${oldTimestamp}`, 'utf8')
        .digest('hex');

      const isValid = verifyNexconnWebhookSignature(
        { signature, nonce, timestamp: oldTimestamp },
        testSecret,
        now
      );

      expect(isValid).toBe(false);
    });
  });

  describe('POST /api/webhooks/nexconn Integration', () => {
    async function createTestChat() {
      // 1. Create seller
      const sellerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: { displayName: 'Webhook Seller', language: 'hi' },
      });
      const seller = sellerRes.json();

      // 2. Create buyer
      const buyerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: { displayName: 'Webhook Buyer', language: 'en' },
      });
      const buyer = buyerRes.json();

      // 3. Create listing
      const listingRes = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: {
          title: 'Mechanical Keyboard',
          description: 'RGB mechanical keyboard',
          price: { amount: 4500, currency: 'INR' },
        },
      });
      const listing = listingRes.json().listing;

      // 4. Create chat
      const chatRes = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: listing.id },
      });
      const chat = chatRes.json();

      return { buyer, seller, listing, chat };
    }

    it('ingests valid message event, persists transcript line, and computes "shownTo" records (D-022)', async () => {
      const { buyer, seller, chat } = await createTestChat();

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = String(Date.now());

      // Prepare HandshakeExtraV1
      const extraPayload = {
        v: 1,
        kind: 'text',
        orig: { lang: 'en', text: 'Is this available for pickup today?' },
        tr: { hi: 'क्या यह आज पिकअप के लिए उपलब्ध है?' },
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(nonce, timestamp),
        payload: {
          event: 'message:send',
          messageId,
          channelId: chat.channelId,
          fromUserId: buyer.user.id,
          content: {
            text: 'Is this available for pickup today?',
            extra: JSON.stringify(extraPayload),
          },
          timestamp: Date.now(),
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.stored).toBe(true);

      // Verify row in database
      const row = await prisma.transcriptLine.findUnique({
        where: { nexconnMessageId: messageId },
      });

      expect(row).toBeDefined();
      expect(row?.origText).toBe('Is this available for pickup today?');
      expect(row?.origLang).toBe('en');

      // Verify "Show Me What They Saw" (D-022)
      const shownTo = row?.shownTo as any;
      expect(shownTo).toBeDefined();

      // Buyer (sender) saw original in English
      expect(shownTo[buyer.user.id]).toEqual({
        lang: 'en',
        text: 'Is this available for pickup today?',
        translated: false,
      });

      // Seller (recipient, Hindi) saw Hindi translation
      expect(shownTo[seller.user.id]).toEqual({
        lang: 'hi',
        text: 'क्या यह आज पिकअप के लिए उपलब्ध है?',
        translated: true,
      });
    });

    it('handles duplicate delivery idempotently without creating duplicate transcript rows', async () => {
      const { buyer, chat } = await createTestChat();

      const messageId = `msg_duplicate_${Date.now()}`;
      const nonce1 = `nonce_dup1_${Date.now()}`;
      const nonce2 = `nonce_dup2_${Date.now()}`;

      const payload = {
        event: 'message:send',
        messageId,
        channelId: chat.channelId,
        fromUserId: buyer.user.id,
        content: { text: 'Hello again' },
        timestamp: Date.now(),
      };

      // First delivery
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(nonce1, String(Date.now())),
        payload,
      });
      expect(res1.statusCode).toBe(200);
      expect(res1.json().stored).toBe(true);

      // Second delivery with different nonce
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(nonce2, String(Date.now())),
        payload,
      });
      expect(res2.statusCode).toBe(200);
      expect(res2.json().duplicate).toBe(true);
      expect(res2.json().stored).toBe(false);
    });

    it('enforces anti-replay protection by rejecting previously consumed nonces (409)', async () => {
      const { buyer, chat } = await createTestChat();

      const sharedNonce = `replay_nonce_${Date.now()}`;
      const payload = {
        event: 'message:send',
        messageId: `msg_replay_${Date.now()}`,
        channelId: chat.channelId,
        fromUserId: buyer.user.id,
        content: { text: 'Checking replay' },
        timestamp: Date.now(),
      };

      // First use of nonce
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(sharedNonce, String(Date.now())),
        payload,
      });
      expect(res1.statusCode).toBe(200);

      // Replay attack with same nonce -> 409 REPLAY_ATTACK_DETECTED
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(sharedNonce, String(Date.now())),
        payload: {
          ...payload,
          messageId: `msg_replay_2_${Date.now()}`,
        },
      });
      expect(res2.statusCode).toBe(409);
      expect(res2.json().error.code).toBe('REPLAY_ATTACK_DETECTED');
    });

    it('detects scam signals (off-platform contact) during webhook ingestion', async () => {
      const { buyer, chat } = await createTestChat();

      const messageId = `msg_scam_${Date.now()}`;
      const nonce = `nonce_scam_${Date.now()}`;

      const res = await app.inject({
        method: 'POST',
        url: '/api/webhooks/nexconn',
        headers: makeWebhookHeaders(nonce, String(Date.now())),
        payload: {
          event: 'message:send',
          messageId,
          channelId: chat.channelId,
          fromUserId: buyer.user.id,
          content: {
            text: 'Contact me on telegram @scammer_acc to pay via wire transfer',
          },
          timestamp: Date.now(),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().scamWarning).toBe(true);
    });
  });
});
