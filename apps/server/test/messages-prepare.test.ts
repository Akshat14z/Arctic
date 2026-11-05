import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';
import { prisma } from '../src/db/prisma.js';

describe('Message Preparation API & Meaning Guard (AKSHAT-T06)', { timeout: 30000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_token_for_messages');
  });

  async function createTestUser(displayName: string, language: 'en' | 'hi' | 'ja') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName, language },
    });
    return res.json() as {
      sessionToken: string;
      user: { id: string; displayName: string; language: string };
    };
  }

  async function createTestListing(sellerToken: string, title: string, amount: number) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        title,
        description: `Description for ${title}`,
        price: { amount, currency: 'INR' },
      },
    });
    return res.json().listing as { id: string; title: string; sellerId: string };
  }

  async function createTestChat(buyerToken: string, listingId: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chats',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: { listingId },
    });
    return res.json() as { channelId: string };
  }

  describe('Security & Validation', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        payload: {
          channelId: 'ch_test_123',
          text: 'Hello, is this available?',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid payload with 400 VALIDATION_ERROR', async () => {
      const user = await createTestUser('Validation User', 'en');

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${user.sessionToken}` },
        payload: {
          channelId: '', // invalid
          text: '', // invalid empty
          senderLang: 'invalid_lang',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 CHAT_NOT_FOUND when channel does not exist', async () => {
      const user = await createTestUser('Lonely Sender', 'en');

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${user.sessionToken}` },
        payload: {
          channelId: 'ch_nonexistent_9999',
          text: 'Hello there',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('CHAT_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user is not a participant in the chat', async () => {
      const seller = await createTestUser('Seller Sita', 'hi');
      const buyer = await createTestUser('Buyer Bob', 'en');
      const intruder = await createTestUser('Intruder Ian', 'en');

      const listing = await createTestListing(seller.sessionToken, 'MacBook Air M2', 75000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${intruder.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'Can I crash this deal?',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('FORBIDDEN');
    });
  });

  describe('Translation & Prepared Payload (D-021)', () => {
    it('translates clean message into recipient language and returns C4 payload without sending', async () => {
      const seller = await createTestUser('Seller Vikram', 'hi');
      const buyer = await createTestUser('Buyer David', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Sony Headphones WH-1000XM5', 22000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      // Record transcript count before prepare
      const countBefore = await prisma.transcriptLine.count({
        where: { channelId: chat.channelId },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'Hello',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      // Check structure
      expect(prepared.messageText).toBe('Hello');
      expect(prepared.extra).toBeDefined();
      expect(prepared.extra.v).toBe(1);
      expect(prepared.extra.kind).toBe('text');
      expect(prepared.extra.orig).toEqual({
        lang: 'en',
        text: 'Hello',
      });

      // Recipient (seller) speaks Hindi ('hi')
      expect(prepared.extra.tr).toBeDefined();
      expect(prepared.extra.tr.hi).toBeDefined();
      expect(prepared.extra.tr.hi.length).toBeGreaterThan(0);

      // Guard check
      expect(prepared.guard).toBeDefined();
      expect(prepared.guard.issues).toEqual([]);
      expect(prepared.guard.blocking).toBe(false);

      // Check extra guard metadata
      expect(prepared.extra.guard).toBeDefined();
      expect(prepared.extra.guard.issues).toEqual([]);
      expect(prepared.extra.guard.acknowledged).toBe(false);

      // Verify NO messages were created in DB
      const countAfter = await prisma.transcriptLine.count({
        where: { channelId: chat.channelId },
      });
      expect(countAfter).toBe(countBefore);
    });

    it('handles same-language conversation without unnecessary translation', async () => {
      const seller = await createTestUser('Hindi Seller', 'hi');
      const buyer = await createTestUser('Hindi Buyer', 'hi');

      const listing = await createTestListing(seller.sessionToken, 'Royal Enfield Helmet', 2500);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'नमस्ते क्या यह अभी भी उपलब्ध है?',
          senderLang: 'hi',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      expect(prepared.extra.orig.lang).toBe('hi');
      expect(prepared.extra.tr.hi).toBe('नमस्ते क्या यह अभी भी उपलब्ध है?');
      expect(prepared.guard.blocking).toBe(false);
    });
  });

  describe('Meaning Guard & Tone Guard Analysis', () => {
    it('detects currency ambiguity (bare numbers & lakh) and marks blocking = true', async () => {
      const seller = await createTestUser('Seller Pooja', 'en');
      const buyer = await createTestUser('Buyer Rahul', 'hi');

      const listing = await createTestListing(seller.sessionToken, 'Used Motorcycle', 90000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'Final price is 2 lakh for this bike',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      expect(prepared.guard.blocking).toBe(true);
      const currencyIssue = prepared.guard.issues.find((i: any) => i.kind === 'currency');
      expect(currencyIssue).toBeDefined();
      expect(currencyIssue.span).toMatch(/2 lakh/i);
      expect(currencyIssue.explanation.en).toBeDefined();
      expect(currencyIssue.explanation.hi).toBeDefined();
      expect(currencyIssue.explanation.ja).toBeDefined();
      expect(currencyIssue.suggestion).toBeDefined();
    });

    it('detects scam signals (off-platform contact) and marks blocking = true', async () => {
      const seller = await createTestUser('Seller ScamCheck', 'en');
      const buyer = await createTestUser('Buyer Honest', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Watch', 5000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'Please message me on whatsapp for faster response',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      expect(prepared.guard.blocking).toBe(true);
      const scamIssue = prepared.guard.issues.find((i: any) => i.kind === 'scam_signal');
      expect(scamIssue).toBeDefined();
      expect(scamIssue.span.toLowerCase()).toContain('whatsapp');
      expect(scamIssue.explanation.en).toContain('Off-platform contact detected');
    });

    it('detects date ambiguity and provides advice with blocking = false', async () => {
      const seller = await createTestUser('Seller TimeCheck', 'en');
      const buyer = await createTestUser('Buyer Timely', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Camera Lens', 15000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'I can pick it up tomorrow or day after tomorrow',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      // Date advice should NOT block sending
      expect(prepared.guard.blocking).toBe(false);
      const dateIssue = prepared.guard.issues.find((i: any) => i.kind === 'date');
      expect(dateIssue).toBeDefined();
      expect(dateIssue.explanation.en).toContain('Vague delivery or meeting timeframe');
      expect(dateIssue.suggestion).toBeDefined();
    });

    it('detects aggressive tone (Tone Guard D-024) and suggests softer phrasing with blocking = false', async () => {
      const seller = await createTestUser('Seller ToneCheck', 'en');
      const buyer = await createTestUser('Buyer Impatient', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Desk Lamp', 1200);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/prepare',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          text: 'Give it to me now hurry up',
          senderLang: 'en',
        },
      });

      expect(response.statusCode).toBe(200);
      const prepared = response.json();

      // D-024: Tone Guard is never blocking
      expect(prepared.guard.blocking).toBe(false);
      const toneIssue = prepared.guard.issues.find((i: any) => i.kind === 'tone');
      expect(toneIssue).toBeDefined();
      expect(toneIssue.suggestion).toBeDefined();
      expect(toneIssue.explanation.en).toBeDefined();
    });
  });
});

