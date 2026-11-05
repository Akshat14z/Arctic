import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import * as nexconnChannels from '../src/nexconn/channels.js';
import { getConfig, resetConfigForTesting } from '../src/config.js';

describe('Golden Path End-to-End Integration (AKSHAT-T09)', { timeout: 60000 }, () => {
  let app: FastifyInstance;

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
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('gp_mock_nexconn_token');
    vi.spyOn(nexconnChannels, 'createEscalationGroupChannel').mockResolvedValue({
      channelId: 'grp_mock_escalation',
      name: 'Dispute Case',
    });
    vi.spyOn(nexconnChannels, 'addMemberToGroupChannel').mockResolvedValue(true);
  });

  it('executes full 8-stage buyer-seller marketplace journey with AI guard, deals, seals, and case dispute', async () => {
    const config = getConfig();

    // =========================================================================
    // STAGE 1: Onboarding (Buyer, Seller, Support Agent)
    // =========================================================================
    // 1.1 Seller signs up (Hindi speaker)
    const sellerAuthRes = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: 'Aarav (Seller)', language: 'hi' },
    });
    expect(sellerAuthRes.statusCode).toBe(201);
    const seller = sellerAuthRes.json();
    expect(seller.sessionToken).toBeDefined();
    expect(seller.user.language).toBe('hi');

    // 1.2 Buyer signs up (English speaker)
    const buyerAuthRes = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: 'John (Buyer)', language: 'en' },
    });
    expect(buyerAuthRes.statusCode).toBe(201);
    const buyer = buyerAuthRes.json();
    expect(buyer.sessionToken).toBeDefined();
    expect(buyer.user.language).toBe('en');

    // 1.3 Support Agent signs up (Multilingual en/hi/ja)
    const agentAuthRes = await app.inject({
      method: 'POST',
      url: '/api/auth/agent',
      payload: {
        displayName: 'Sarah (Agent)',
        language: 'en',
        agentLanguages: ['en', 'hi', 'ja'],
        code: config.AGENT_ACCESS_CODE,
      },
    });
    expect(agentAuthRes.statusCode).toBe(201);
    const agent = agentAuthRes.json();
    expect(agent.user.role).toBe('agent');

    // =========================================================================
    // STAGE 2: Marketplace Listing CRUD & Multilingual Read
    // =========================================================================
    // 2.1 Seller creates listing in Hindi
    const listingRes = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: {
        title: 'सोनी हेडफोन XM5',
        description: 'उत्कृष्ट स्थिति में प्रीमियम नॉइज़ कैंसिलिंग हेडफोन।',
        price: { amount: 24000, currency: 'INR' },
      },
    });
    expect(listingRes.statusCode).toBe(201);
    const listing = listingRes.json().listing;
    expect(listing.id).toBeDefined();
    expect(listing.price.amount).toBe(24000);

    // 2.2 Buyer views listing translated to English (Public, unauthenticated)
    const listingDetailRes = await app.inject({
      method: 'GET',
      url: `/api/listings/${listing.id}?lang=en`,
    });
    expect(listingDetailRes.statusCode).toBe(200);
    const viewedListing = listingDetailRes.json().listing;
    expect(viewedListing.id).toBe(listing.id);
    expect(viewedListing.title).toBeDefined();

    // =========================================================================
    // STAGE 3: Chat Creation & Conversation Setup
    // =========================================================================
    const chatRes = await app.inject({
      method: 'POST',
      url: '/api/chats',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { listingId: listing.id },
    });
    expect(chatRes.statusCode).toBe(200);
    const chat = chatRes.json();
    expect(chat.channelId).toBeDefined();
    expect(chat.seller.id).toBe(seller.user.id);

    // =========================================================================
    // STAGE 4: Message Preparation (Translation + Meaning Guard)
    // =========================================================================
    // Buyer prepares negotiation offer: ₹22,000 with shipping
    const prepRes = await app.inject({
      method: 'POST',
      url: '/api/messages/prepare',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: {
        channelId: chat.channelId,
        text: 'Hello, will you take ₹22,000 if you ship it tomorrow?',
        senderLang: 'en',
      },
    });
    expect(prepRes.statusCode).toBe(200);
    const prepared = prepRes.json();
    expect(prepared.extra).toBeDefined();
    expect(prepared.extra.tr.hi).toBeDefined(); // Translated to seller's language (Hindi)
    expect(prepared.guard).toBeDefined();

    // =========================================================================
    // STAGE 5: Webhook Ingestion & "Show Me What They Saw" (D-022)
    // =========================================================================
    const msgId = `msg_gp_${Date.now()}`;
    const nonce = `nonce_gp_${Date.now()}`;
    const timestamp = String(Date.now());

    const webhookRes = await app.inject({
      method: 'POST',
      url: '/api/webhooks/nexconn',
      headers: makeWebhookHeaders(nonce, timestamp),
      payload: {
        event: 'message:send',
        messageId: msgId,
        channelId: chat.channelId,
        fromUserId: buyer.user.id,
        content: {
          text: prepared.messageText,
          extra: JSON.stringify(prepared.extra),
        },
        timestamp: Date.now(),
      },
    });
    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.json().stored).toBe(true);

    // =========================================================================
    // STAGE 6: Deal Extraction & Mutual Agreement (Handshake Seal D-023)
    // =========================================================================
    // 6.1 Extract deal proposal (auto-detects price ₹22,000 and shipping)
    const extractDealRes = await app.inject({
      method: 'POST',
      url: '/api/deals/extract',
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: { channelId: chat.channelId },
    });
    expect(extractDealRes.statusCode).toBe(200);
    const deal = extractDealRes.json().deal;
    expect(deal.status).toBe('proposed');
    expect(deal.price.amount).toBe(22000);
    expect(deal.delivery.method).toBe('shipping');

    // 6.2 Buyer agrees to deal
    const agreeBuyerRes = await app.inject({
      method: 'POST',
      url: `/api/deals/${deal.id}/agree`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(agreeBuyerRes.statusCode).toBe(200);
    expect(agreeBuyerRes.json().deal.status).toBe('proposed');

    // 6.3 Seller agrees to deal -> Deal sealed!
    const agreeSellerRes = await app.inject({
      method: 'POST',
      url: `/api/deals/${deal.id}/agree`,
      headers: { authorization: `Bearer ${seller.sessionToken}` },
    });
    expect(agreeSellerRes.statusCode).toBe(200);
    const sealedDeal = agreeSellerRes.json().deal;
    expect(sealedDeal.status).toBe('agreed');
    expect(sealedDeal.sealCode).toBeDefined();

    // 6.4 Public Seal Verification (D-023)
    const sealCheckRes = await app.inject({
      method: 'GET',
      url: `/api/seals/${sealedDeal.sealCode}`,
    });
    expect(sealCheckRes.statusCode).toBe(200);
    const sealData = sealCheckRes.json();
    expect(sealData.deal.id).toBe(deal.id);
    expect(sealData.sealedAt).toBeDefined();
    expect(sealData.buyer.displayName).toBe('John (Buyer)');
    expect(sealData.seller.displayName).toBe('Aarav (Seller)');

    // =========================================================================
    // STAGE 7: Support Escalation & Dispute Resolution (D-018, D-021, D-022)
    // =========================================================================
    // 7.1 Buyer opens dispute case
    const openCaseRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: {
        channelId: chat.channelId,
        reason: 'item_not_as_described',
        note: 'Package arrived damaged and item does not power on',
      },
    });
    expect(openCaseRes.statusCode).toBe(200);
    const openedCase = openCaseRes.json().case;
    expect(openedCase.id).toBeDefined();
    expect(openedCase.status).toBe('open');
    expect(openedCase.dealSnapshot).toBeDefined(); // Frozen deal snapshot (D-018)
    expect(openedCase.dealSnapshot.id).toBe(deal.id);

    // 7.2 Agent checks queue
    const queueRes = await app.inject({
      method: 'GET',
      url: '/api/agent/queue',
      headers: { authorization: `Bearer ${agent.sessionToken}` },
    });
    expect(queueRes.statusCode).toBe(200);
    const queue = queueRes.json().items;
    expect(queue.some((c: any) => c.id === openedCase.id)).toBe(true);

    // 7.3 Agent claims case (3-way escalation room)
    const claimRes = await app.inject({
      method: 'POST',
      url: `/api/cases/${openedCase.id}/claim`,
      headers: { authorization: `Bearer ${agent.sessionToken}` },
    });
    expect(claimRes.statusCode).toBe(200);
    expect(claimRes.json().case.status).toBe('claimed');
    expect(claimRes.json().case.agent.id).toBe(agent.user.id);

    // 7.4 Agent inspects bilingual transcript & what each party saw (D-022)
    const caseDetailRes = await app.inject({
      method: 'GET',
      url: `/api/cases/${openedCase.id}`,
      headers: { authorization: `Bearer ${agent.sessionToken}` },
    });
    expect(caseDetailRes.statusCode).toBe(200);
    const detail = caseDetailRes.json();
    expect(detail.case.id).toBe(openedCase.id);
    expect(detail.transcript).toBeInstanceOf(Array);
    expect(detail.summary).toBeDefined();

    // 7.5 Agent resolves case
    const resolveRes = await app.inject({
      method: 'POST',
      url: `/api/cases/${openedCase.id}/resolve`,
      headers: { authorization: `Bearer ${agent.sessionToken}` },
      payload: {
        resolution: 'Return approved: Seller provides return label and refund issued upon tracking scan.',
      },
    });
    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.json().case.status).toBe('resolved');
    expect(resolveRes.json().case.resolution).toContain('Return approved');

    // =========================================================================
    // STAGE 8: Judge Sandbox Verification (D-015)
    // =========================================================================
    const demoRes = await app.inject({
      method: 'POST',
      url: '/api/demo/session',
      payload: { as: 'seller' },
    });
    expect(demoRes.statusCode).toBe(200);
    expect(demoRes.json().user.id).toBe('demo_u_seller');
    expect(demoRes.json().user.isDemo).toBe(true);
  });
});
