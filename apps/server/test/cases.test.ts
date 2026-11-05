import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import * as nexconnChannels from '../src/nexconn/channels.js';
import { getConfig, resetConfigForTesting } from '../src/config.js';

describe('Cases & Support Escalation API (AKSHAT-T07)', { timeout: 35000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_token_for_cases');
    vi.spyOn(nexconnChannels, 'createEscalationGroupChannel').mockResolvedValue(undefined);
    vi.spyOn(nexconnChannels, 'addMemberToGroupChannel').mockResolvedValue(undefined);
  });

  async function createTestUser(displayName: string, language: 'en' | 'hi' | 'ja') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName, language },
    });
    return res.json() as {
      sessionToken: string;
      user: { id: string; displayName: string; language: string; role: string };
    };
  }

  async function createTestAgent(displayName: string, language: 'en' | 'hi' | 'ja') {
    const config = getConfig();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/agent',
      payload: {
        displayName,
        language,
        agentLanguages: ['en', 'hi', 'ja'],
        code: config.AGENT_ACCESS_CODE,
      },
    });
    return res.json() as {
      sessionToken: string;
      user: { id: string; displayName: string; language: string; role: string };
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

  describe('POST /api/cases (Escalation & Get Help)', () => {
    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        payload: {
          channelId: 'ch_test_dummy',
          reason: 'item_not_as_described',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid payload with 400 VALIDATION_ERROR', async () => {
      const user = await createTestUser('Case Validation User', 'en');

      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${user.sessionToken}` },
        payload: {
          channelId: '',
          reason: 'unsupported_reason',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 CHAT_NOT_FOUND when channel does not exist', async () => {
      const user = await createTestUser('Lost Buyer', 'en');

      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${user.sessionToken}` },
        payload: {
          channelId: 'ch_nonexistent_chat_9999',
          reason: 'payment_issue',
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('CHAT_NOT_FOUND');
    });

    it('returns 403 FORBIDDEN when user is not a participant in the chat', async () => {
      const seller = await createTestUser('Seller Reeta', 'hi');
      const buyer = await createTestUser('Buyer Mohan', 'en');
      const outsider = await createTestUser('Outsider Oscar', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Samsung Galaxy S24', 65000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${outsider.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'scam_suspected',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('creates a 3-way dispute case and returns C6 case with groupChannelId', async () => {
      const seller = await createTestUser('Seller Suresh', 'hi');
      const buyer = await createTestUser('Buyer Ankit', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Dell XPS 15', 85000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'item_not_as_described',
          note: 'The screen is scratched and does not turn on',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.case).toBeDefined();

      const c = data.case;
      expect(c.id).toMatch(/^c_/);
      expect(c.channelId).toBe(chat.channelId);
      expect(c.groupChannelId).toMatch(/^grp_c_/);
      expect(c.buyer.id).toBe(buyer.user.id);
      expect(c.seller.id).toBe(seller.user.id);
      expect(c.reason).toBe('item_not_as_described');
      expect(c.status).toBe('open');
      expect(c.slaDueAt).toBeDefined();
      expect(c.languages).toContain('en');
      expect(c.languages).toContain('hi');

      // Check chat detail reflects openCaseId (DHRUMIL-010 #6)
      const chatRes = await app.inject({
        method: 'GET',
        url: `/api/chats/${chat.channelId}`,
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
      });
      expect(chatRes.statusCode).toBe(200);
      expect(chatRes.json().openCaseId).toBe(c.id);
    });

    it('is idempotent: re-calling POST /api/cases returns existing active case (DHRUMIL-010 #1)', async () => {
      const seller = await createTestUser('Seller Deepak', 'hi');
      const buyer = await createTestUser('Buyer Neha', 'en');

      const listing = await createTestListing(seller.sessionToken, 'OnePlus 12', 45000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'misunderstanding',
        },
      });
      expect(firstRes.statusCode).toBe(200);
      const firstCase = firstRes.json().case;

      // Seller or buyer taps "Get help" second time
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'misunderstanding',
        },
      });
      expect(secondRes.statusCode).toBe(200);
      const secondCase = secondRes.json().case;

      expect(secondCase.id).toBe(firstCase.id);
      expect(secondCase.groupChannelId).toBe(firstCase.groupChannelId);
    });
  });

  describe('Agent Queue & Dispatch (GET /api/agent/queue)', () => {
    it('blocks regular user with 403 FORBIDDEN', async () => {
      const regularUser = await createTestUser('Regular User', 'en');

      const res = await app.inject({
        method: 'GET',
        url: '/api/agent/queue',
        headers: { authorization: `Bearer ${regularUser.sessionToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('allows support agent to retrieve queue ordered by open status and SLA', async () => {
      const agent = await createTestAgent('Agent Maya', 'en');

      const res = await app.inject({
        method: 'GET',
        url: '/api/agent/queue',
        headers: { authorization: `Bearer ${agent.sessionToken}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Case Lifecycle: Claim & Resolve', () => {
    it('supports agent claim, double-tap idempotency, and blocks other agents with 409 conflict', async () => {
      const seller = await createTestUser('Seller Manoj', 'hi');
      const buyer = await createTestUser('Buyer Priya', 'en');
      const agent1 = await createTestAgent('Agent Arjun', 'en');
      const agent2 = await createTestAgent('Agent PriyaK', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Bose SoundLink', 11000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const caseRes = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'item_not_as_described',
        },
      });
      const caseId = caseRes.json().case.id;

      // 1. Agent 1 claims case -> 200 OK
      const claim1Res = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/claim`,
        headers: { authorization: `Bearer ${agent1.sessionToken}` },
      });
      expect(claim1Res.statusCode).toBe(200);
      const claimedCase = claim1Res.json().case;
      expect(claimedCase.status).toBe('claimed');
      expect(claimedCase.agent.id).toBe(agent1.user.id);

      // 2. Double-tap by same agent returns 200 OK with same case (DHRUMIL-011 #2)
      const repeatClaimRes = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/claim`,
        headers: { authorization: `Bearer ${agent1.sessionToken}` },
      });
      expect(repeatClaimRes.statusCode).toBe(200);
      expect(repeatClaimRes.json().case.id).toBe(caseId);

      // 3. Agent 2 tries to claim already claimed case -> 409 CASE_ALREADY_CLAIMED
      const conflictClaimRes = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/claim`,
        headers: { authorization: `Bearer ${agent2.sessionToken}` },
      });
      expect(conflictClaimRes.statusCode).toBe(409);
      expect(conflictClaimRes.json().error.code).toBe('CASE_ALREADY_CLAIMED');
    });

    it('allows claiming agent to resolve case and prevents unauthorized resolution', async () => {
      const seller = await createTestUser('Seller Rajesh', 'hi');
      const buyer = await createTestUser('Buyer Tina', 'en');
      const agent1 = await createTestAgent('Agent Rohit', 'en');
      const agent2 = await createTestAgent('Agent Sneha', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Kindle Paperwhite', 7999);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const caseRes = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'other',
        },
      });
      const caseId = caseRes.json().case.id;

      // Agent 1 claims
      await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/claim`,
        headers: { authorization: `Bearer ${agent1.sessionToken}` },
      });

      // Agent 2 tries to resolve -> 403 FORBIDDEN
      const badResolveRes = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/resolve`,
        headers: { authorization: `Bearer ${agent2.sessionToken}` },
        payload: { resolution: 'Resolved by another agent' },
      });
      expect(badResolveRes.statusCode).toBe(403);
      expect(badResolveRes.json().error.code).toBe('FORBIDDEN');

      // Agent 1 resolves -> 200 OK
      const resolveRes = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/resolve`,
        headers: { authorization: `Bearer ${agent1.sessionToken}` },
        payload: { resolution: 'Parties agreed to partial refund of ₹1000' },
      });
      expect(resolveRes.statusCode).toBe(200);
      const resolved = resolveRes.json().case;
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution).toBe('Parties agreed to partial refund of ₹1000');
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe('GET /api/cases/:id (Case Detail & History)', () => {
    it('allows buyer, seller, and agent to view case detail and blocks intruders (403)', async () => {
      const seller = await createTestUser('Seller Alok', 'hi');
      const buyer = await createTestUser('Buyer Simran', 'en');
      const agent = await createTestAgent('Agent Officer', 'en');
      const intruder = await createTestUser('Intruder Igor', 'en');

      const listing = await createTestListing(seller.sessionToken, 'Apple Watch Series 9', 32000);
      const chat = await createTestChat(buyer.sessionToken, listing.id);

      const caseRes = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          channelId: chat.channelId,
          reason: 'payment_issue',
        },
      });
      const caseId = caseRes.json().case.id;

      // 1. Intruder -> 403 FORBIDDEN
      const intruderRes = await app.inject({
        method: 'GET',
        url: `/api/cases/${caseId}`,
        headers: { authorization: `Bearer ${intruder.sessionToken}` },
      });
      expect(intruderRes.statusCode).toBe(403);

      // 2. Buyer -> 200 OK
      const buyerRes = await app.inject({
        method: 'GET',
        url: `/api/cases/${caseId}`,
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
      });
      expect(buyerRes.statusCode).toBe(200);
      const buyerData = buyerRes.json();
      expect(buyerData.case.id).toBe(caseId);
      expect(buyerData.summary).toBeDefined();
      expect(buyerData.transcript).toBeDefined();

      // 3. Seller -> 200 OK
      const sellerRes = await app.inject({
        method: 'GET',
        url: `/api/cases/${caseId}`,
        headers: { authorization: `Bearer ${seller.sessionToken}` },
      });
      expect(sellerRes.statusCode).toBe(200);

      // 4. Agent -> 200 OK
      const agentRes = await app.inject({
        method: 'GET',
        url: `/api/cases/${caseId}`,
        headers: { authorization: `Bearer ${agent.sessionToken}` },
      });
      expect(agentRes.statusCode).toBe(200);
    });
  });
});
