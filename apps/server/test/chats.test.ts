import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';

describe('Chat Infrastructure API Integration (AKSHAT-T05)', { timeout: 25000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_token_for_chats');
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

  describe('POST /api/chats (Create or Get Conversation)', () => {
    it('creates a new conversation (its own group, D-029) between buyer and seller', async () => {
      const seller = await createTestUser('Seller Ramesh', 'hi');
      const buyer = await createTestUser('Buyer Amit', 'en');
      const listing = await createTestListing(seller.sessionToken, 'iPhone 14 Pro 128GB', 62000);

      const response = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: {
          listingId: listing.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      expect(data.channelId).toBe(`ch_${buyer.user.id}_${listing.id}`);
      expect(data.channelType).toBe('group'); // D-029: one Nexconn group per buyer+listing chat
      expect(data.seller).toBeDefined();
      expect(data.seller.id).toBe(seller.user.id);
      expect(data.seller.displayName).toBe('Seller Ramesh');
      expect(data.listing).toBeDefined();
      expect(data.listing.id).toBe(listing.id);
    });

    it('is idempotent: repeated calls return the existing conversation without duplicates', async () => {
      const seller = await createTestUser('Seller Sita', 'en');
      const buyer = await createTestUser('Buyer Gita', 'hi');
      const listing = await createTestListing(seller.sessionToken, 'Canon EOS R50', 54000);

      // Call 1: creates
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: listing.id },
      });
      expect(firstRes.statusCode).toBe(200);
      const firstData = firstRes.json();

      // Call 2: retrieves existing
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: listing.id },
      });
      expect(secondRes.statusCode).toBe(200);
      const secondData = secondRes.json();

      expect(secondData.channelId).toBe(firstData.channelId);
      expect(secondData.seller.id).toBe(firstData.seller.id);
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chats',
        payload: { listingId: 'l_mock_123' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects nonexistent listing with 404 LISTING_NOT_FOUND', async () => {
      const buyer = await createTestUser('Buyer Solo', 'en');

      const response = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: 'l_nonexistent_999999' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('LISTING_NOT_FOUND');
    });

    it('prevents seller from starting a conversation with themselves (400 CANNOT_CHAT_WITH_SELF)', async () => {
      const seller = await createTestUser('Self Trader', 'en');
      const listing = await createTestListing(seller.sessionToken, 'Self Listed Product', 1000);

      // Seller attempts to call POST /api/chats on their own listing
      const response = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: { listingId: listing.id },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('CANNOT_CHAT_WITH_SELF');
    });
  });

  describe('GET /api/chats (Inbox)', () => {
    it('returns conversations where user is buyer or seller', async () => {
      const seller = await createTestUser('Inbox Seller', 'hi');
      const buyer = await createTestUser('Inbox Buyer', 'en');
      const listing = await createTestListing(seller.sessionToken, 'iPad Mini 6', 38000);

      // Create conversation
      await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: listing.id },
      });

      // 1. Buyer inbox: sees conversation with otherUser = seller
      const buyerInbox = await app.inject({
        method: 'GET',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
      });
      expect(buyerInbox.statusCode).toBe(200);
      const buyerData = buyerInbox.json();
      const buyerItem = buyerData.items.find((c: any) => c.listing.id === listing.id);
      expect(buyerItem).toBeDefined();
      expect(buyerItem.otherUser.id).toBe(seller.user.id);
      expect(buyerItem.otherUser.displayName).toBe('Inbox Seller');

      // 2. Seller inbox: sees conversation with otherUser = buyer
      const sellerInbox = await app.inject({
        method: 'GET',
        url: '/api/chats',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
      });
      expect(sellerInbox.statusCode).toBe(200);
      const sellerData = sellerInbox.json();
      const sellerItem = sellerData.items.find((c: any) => c.listing.id === listing.id);
      expect(sellerItem).toBeDefined();
      expect(sellerItem.otherUser.id).toBe(buyer.user.id);
      expect(sellerItem.otherUser.displayName).toBe('Inbox Buyer');
    });
  });

  describe('GET /api/chats/:id (Conversation Detail & Security)', () => {
    it('allows participant to retrieve chat detail and blocks unrelated users (403 FORBIDDEN)', async () => {
      const seller = await createTestUser('Secret Seller', 'en');
      const buyer = await createTestUser('Secret Buyer', 'en');
      const intruder = await createTestUser('Curious Intruder', 'en');
      const listing = await createTestListing(seller.sessionToken, 'Gaming Rig RTX 4080', 185000);

      // Create conversation
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/chats',
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
        payload: { listingId: listing.id },
      });
      const channelId = createRes.json().channelId;

      // 1. Intruder attempts access -> 403 FORBIDDEN
      const intruderRes = await app.inject({
        method: 'GET',
        url: `/api/chats/${channelId}`,
        headers: { authorization: `Bearer ${intruder.sessionToken}` },
      });
      expect(intruderRes.statusCode).toBe(403);
      expect(intruderRes.json().error.code).toBe('FORBIDDEN');

      // 2. Buyer accesses -> 200 OK
      const buyerRes = await app.inject({
        method: 'GET',
        url: `/api/chats/${channelId}`,
        headers: { authorization: `Bearer ${buyer.sessionToken}` },
      });
      expect(buyerRes.statusCode).toBe(200);
      const detail = buyerRes.json();
      expect(detail.channelId).toBe(channelId);
      expect(detail.channelType).toBe('group'); // D-029
      expect(detail.buyer.id).toBe(buyer.user.id);
      expect(detail.seller.id).toBe(seller.user.id);
      expect(detail.listing.id).toBe(listing.id);

      // 3. Seller accesses -> 200 OK
      const sellerRes = await app.inject({
        method: 'GET',
        url: `/api/chats/${channelId}`,
        headers: { authorization: `Bearer ${seller.sessionToken}` },
      });
      expect(sellerRes.statusCode).toBe(200);
      expect(sellerRes.json().channelId).toBe(channelId);
    });

    it('returns 404 CHAT_NOT_FOUND for non-existent channel ID', async () => {
      const user = await createTestUser('Any User', 'en');

      const response = await app.inject({
        method: 'GET',
        url: '/api/chats/ch_nonexistent_random_id_999',
        headers: { authorization: `Bearer ${user.sessionToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('CHAT_NOT_FOUND');
    });
  });
});

