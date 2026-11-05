import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';
import { prisma } from '../src/db/prisma.js';

describe('Deals, Mutual Agreement & Handshake Seal (AKSHAT-T12, AKSHAT-T15)', { timeout: 35000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_nexconn_token_for_deals');
  });

  async function createTestMarketplaceScenario() {
    // 1. Seller (Hindi)
    const sellerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: 'Deal Seller', language: 'hi' },
    });
    const seller = sellerRes.json();

    // 2. Buyer (English)
    const buyerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: 'Deal Buyer', language: 'en' },
    });
    const buyer = buyerRes.json();

    // 3. Listing
    const listingRes = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: {
        title: 'Sony WH-1000XM4 Headphones',
        description: 'Noise cancelling headphones in like-new condition',
        price: { amount: 18000, currency: 'INR' },
      },
    });
    const listing = listingRes.json().listing;

    // 4. Chat
    const chatRes = await app.inject({
      method: 'POST',
      url: '/api/chats',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { listingId: listing.id },
    });
    const chat = chatRes.json();

    return { seller, buyer, listing, chat };
  }

  it('extracts deal proposal from chat and listing with default listing price', async () => {
    const { buyer, chat } = await createTestMarketplaceScenario();

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals/extract',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { channelId: chat.channelId },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.deal).toBeDefined();
    expect(data.deal.channelId).toBe(chat.channelId);
    expect(data.deal.status).toBe('proposed');
    expect(data.deal.price.amount).toBe(18000);
    expect(data.deal.price.currency).toBe('INR');
    expect(data.deal.delivery.method).toBe('pickup');
    expect(data.deal.item.en).toBeDefined();
    expect(data.deal.item.hi).toBeDefined();
    expect(data.deal.conditions.en.length).toBeGreaterThan(0);
  });

  it('detects negotiated price and shipping from transcript history during extraction', async () => {
    const { buyer, seller, chat } = await createTestMarketplaceScenario();

    // Ingest simulated transcript lines: negotiation down to 16,500 with shipping
    await prisma.transcriptLine.createMany({
      data: [
        {
          nexconnMessageId: `msg_${Date.now()}_1`,
          channelId: chat.channelId,
          fromId: buyer.user.id,
          at: new Date(),
          origLang: 'en',
          origText: 'Will you take ₹16,500 if you ship it?',
          tr: { hi: 'क्या आप इसे शिप करेंगे तो ₹16,500 में देंगे?' },
          shownTo: {},
        },
        {
          nexconnMessageId: `msg_${Date.now()}_2`,
          channelId: chat.channelId,
          fromId: seller.user.id,
          at: new Date(),
          origLang: 'hi',
          origText: 'हाँ, ₹16500 ठीक है।',
          tr: { en: 'Yes, ₹16500 is fine.' },
          shownTo: {},
        },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals/extract',
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: { channelId: chat.channelId },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.deal.price.amount).toBe(16500);
    expect(data.deal.delivery.method).toBe('shipping');
  });

  it('rejects extraction by unauthorized non-participant (403)', async () => {
    const { chat } = await createTestMarketplaceScenario();

    // Create third user (intruder)
    const intruderRes = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: 'Intruder', language: 'en' },
    });
    const intruder = intruderRes.json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/deals/extract',
      headers: { authorization: `Bearer ${intruder.sessionToken}` },
      payload: { channelId: chat.channelId },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('handles mutual agreement journey: partial agreement -> mutual agreement -> generates Handshake Seal (D-023)', async () => {
    const { buyer, seller, chat } = await createTestMarketplaceScenario();

    // 1. Extract proposed deal
    const extractRes = await app.inject({
      method: 'POST',
      url: '/api/deals/extract',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { channelId: chat.channelId },
    });
    const deal = extractRes.json().deal;
    expect(deal.status).toBe('proposed');
    expect(deal.sealCode).toBeUndefined();

    // 2. Buyer agrees
    const agree1Res = await app.inject({
      method: 'POST',
      url: `/api/deals/${deal.id}/agree`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(agree1Res.statusCode).toBe(200);
    const dealAfterBuyer = agree1Res.json().deal;
    expect(dealAfterBuyer.status).toBe('proposed'); // Still waiting for seller
    expect(dealAfterBuyer.agreedBy.buyer).toBeDefined();
    expect(dealAfterBuyer.agreedBy.seller).toBeUndefined();
    expect(dealAfterBuyer.sealCode).toBeUndefined();

    // 3. Seller agrees -> Mutual agreement achieved!
    const agree2Res = await app.inject({
      method: 'POST',
      url: `/api/deals/${deal.id}/agree`,
      headers: { authorization: `Bearer ${seller.sessionToken}` },
    });
    expect(agree2Res.statusCode).toBe(200);
    const dealAfterSeller = agree2Res.json().deal;
    expect(dealAfterSeller.status).toBe('agreed');
    expect(dealAfterSeller.agreedBy.buyer).toBeDefined();
    expect(dealAfterSeller.agreedBy.seller).toBeDefined();
    expect(dealAfterSeller.sealCode).toBeDefined();
    expect(dealAfterSeller.sealCode).toMatch(/^s_[0-9a-f]+$/);

    // 4. Verify public unauthenticated seal page: GET /api/seals/:code (D-023)
    const sealRes = await app.inject({
      method: 'GET',
      url: `/api/seals/${dealAfterSeller.sealCode}`,
    });
    expect(sealRes.statusCode).toBe(200);
    const sealData = sealRes.json();
    expect(sealData.deal.id).toBe(deal.id);
    expect(sealData.deal.status).toBe('agreed');
    expect(sealData.sealedAt).toBeDefined();
    expect(sealData.buyer.displayName).toBe('Deal Buyer');
    expect(sealData.seller.displayName).toBe('Deal Seller');
  });

  it('returns 404 for non-existent or unsealed code lookup', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/seals/s_non_existent_seal_code_9999',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('SEAL_NOT_FOUND');
  });
});
