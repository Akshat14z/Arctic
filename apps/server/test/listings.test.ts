import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';
import { prisma } from '../src/db/prisma.js';

describe('Marketplace Listings API Integration (AKSHAT-T04)', { timeout: 25000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_token_for_listings');
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

  describe('POST /api/listings (Create Listing)', () => {
    it('creates a listing successfully for authenticated seller', async () => {
      const seller = await createTestUser('Aarav Electronics', 'hi');

      const response = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: {
          authorization: `Bearer ${seller.sessionToken}`,
        },
        payload: {
          title: 'Sony WH-1000XM5 Noise Cancelling Headphones',
          description: 'Brand new in box, sealed with warranty.',
          price: {
            amount: 24999,
            currency: 'INR',
          },
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();

      expect(data.listing).toBeDefined();
      expect(data.listing.id).toMatch(/^l_/);
      expect(data.listing.sellerId).toBe(seller.user.id);
      expect(data.listing.title).toBe('Sony WH-1000XM5 Noise Cancelling Headphones');
      expect(data.listing.price.amount).toBe(24999);
      expect(data.listing.price.currency).toBe('INR');
      expect(data.listing.lang).toBe('hi');
      expect(data.listing.seller).toBeDefined();
      expect(data.listing.seller.displayName).toBe('Aarav Electronics');
    });

    it('rejects unauthenticated listing creation with 401 UNAUTHORIZED', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/listings',
        payload: {
          title: 'Unauthenticated Item',
          description: 'This should fail',
          price: { amount: 1000 },
        },
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid input with 400 VALIDATION_ERROR', async () => {
      const seller = await createTestUser('Test Seller', 'en');

      const response = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: {
          authorization: `Bearer ${seller.sessionToken}`,
        },
        payload: {
          title: '', // empty title
          description: 'Valid description',
          price: { amount: -500 }, // negative amount
        },
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/listings & GET /api/listings/:id', () => {
    it('retrieves public listings with pagination and search query', async () => {
      const seller = await createTestUser('Laptop Store', 'en');

      // Create two distinct listings
      const l1Res = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: {
          title: 'MacBook Air M2 16GB',
          description: 'Midnight blue, battery health 99%',
          price: { amount: 89000, currency: 'INR' },
        },
      });
      const l1 = l1Res.json().listing;

      await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: {
          title: 'Dell XPS 13 OLED',
          description: '32GB RAM, Intel Core i7',
          price: { amount: 110000, currency: 'INR' },
        },
      });

      // 1. Browse listings (public, no auth header needed)
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/listings',
      });
      expect(listRes.statusCode).toBe(200);
      const listData = listRes.json();
      expect(Array.isArray(listData.items)).toBe(true);
      expect(listData.items.length).toBeGreaterThanOrEqual(2);

      // 2. Search query filter
      const searchRes = await app.inject({
        method: 'GET',
        url: '/api/listings?q=MacBook',
      });
      expect(searchRes.statusCode).toBe(200);
      const searchData = searchRes.json();
      expect(searchData.items.some((item: any) => item.id === l1.id)).toBe(true);

      // 3. Get single listing by ID
      const singleRes = await app.inject({
        method: 'GET',
        url: `/api/listings/${l1.id}`,
      });
      expect(singleRes.statusCode).toBe(200);
      const singleData = singleRes.json();
      expect(singleData.listing.id).toBe(l1.id);
      expect(singleData.listing.title).toBe('MacBook Air M2 16GB');
      expect(singleData.listing.seller.displayName).toBe('Laptop Store');
    });

    it('returns 404 LISTING_NOT_FOUND for non-existent ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/listings/l_non_existent_999999',
      });

      expect(response.statusCode).toBe(404);
      const data = response.json();
      expect(data.error.code).toBe('LISTING_NOT_FOUND');
    });
  });

  describe('Translated Reads & Fallback', () => {
    it('returns translated content when translation exists in requested language', async () => {
      const seller = await createTestUser('Tokyo Gadgets', 'ja');

      // 1. Create original listing in Japanese
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${seller.sessionToken}` },
        payload: {
          title: 'ニンテンドースイッチ 有機ELモデル',
          description: 'ほぼ新品、箱と付属品完備です。',
          price: { amount: 35000, currency: 'JPY' },
        },
      });
      const listing = createRes.json().listing;

      // 2. Store an English translation in listing_translations
      await prisma.listingTranslation.create({
        data: {
          listingId: listing.id,
          lang: 'en',
          title: 'Nintendo Switch OLED Model',
          description: 'Like new, complete with box and all accessories.',
        },
      });

      // 3. Fetch with ?lang=en -> should return English translation
      const enRes = await app.inject({
        method: 'GET',
        url: `/api/listings/${listing.id}?lang=en`,
      });
      expect(enRes.statusCode).toBe(200);
      const enData = enRes.json();
      expect(enData.listing.title).toBe('Nintendo Switch OLED Model');
      expect(enData.listing.description).toBe('Like new, complete with box and all accessories.');

      // 4. Fetch with ?lang=hi (no Hindi translation exists) -> cleanly fall back to original Japanese
      const hiRes = await app.inject({
        method: 'GET',
        url: `/api/listings/${listing.id}?lang=hi`,
      });
      expect(hiRes.statusCode).toBe(200);
      const hiData = hiRes.json();
      expect(hiData.listing.title).toBe('ニンテンドースイッチ 有機ELモデル');
      expect(hiData.listing.description).toBe('ほぼ新品、箱と付属品完備です。');
    });
  });

  describe('PATCH /api/listings/:id & DELETE /api/listings/:id (Authorization)', () => {
    it('allows owner to update their listing and prevents non-owners (403 FORBIDDEN)', async () => {
      const owner = await createTestUser('Legit Owner', 'en');
      const intruder = await createTestUser('Intruder User', 'en');

      // 1. Owner creates listing
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${owner.sessionToken}` },
        payload: {
          title: 'iPad Pro 11-inch M4',
          description: 'Space Black 256GB',
          price: { amount: 99900, currency: 'INR' },
        },
      });
      const listingId = createRes.json().listing.id;

      // 2. Intruder attempts to update owner listing -> 403 FORBIDDEN
      const unauthorizedUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/listings/${listingId}`,
        headers: { authorization: `Bearer ${intruder.sessionToken}` },
        payload: {
          title: 'Hacked Title',
          price: { amount: 100 },
        },
      });
      expect(unauthorizedUpdate.statusCode).toBe(403);
      expect(unauthorizedUpdate.json().error.code).toBe('FORBIDDEN');

      // 3. Owner updates listing -> 200 OK
      const authorizedUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/listings/${listingId}`,
        headers: { authorization: `Bearer ${owner.sessionToken}` },
        payload: {
          title: 'iPad Pro 11-inch M4 (Price Drop)',
          price: { amount: 94900, currency: 'INR' },
        },
      });
      expect(authorizedUpdate.statusCode).toBe(200);
      const updatedData = authorizedUpdate.json();
      expect(updatedData.listing.title).toBe('iPad Pro 11-inch M4 (Price Drop)');
      expect(updatedData.listing.price.amount).toBe(94900);
      expect(updatedData.listing.sellerId).toBe(owner.user.id); // ownership retained
    });

    it('allows owner to delete their listing and prevents non-owners (403 FORBIDDEN)', async () => {
      const owner = await createTestUser('Delete Test Owner', 'en');
      const intruder = await createTestUser('Delete Test Intruder', 'en');

      // 1. Owner creates listing
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/listings',
        headers: { authorization: `Bearer ${owner.sessionToken}` },
        payload: {
          title: 'Item To Delete',
          description: 'Will be removed',
          price: { amount: 500 },
        },
      });
      const listingId = createRes.json().listing.id;

      // 2. Intruder attempts deletion -> 403 FORBIDDEN
      const unauthorizedDelete = await app.inject({
        method: 'DELETE',
        url: `/api/listings/${listingId}`,
        headers: { authorization: `Bearer ${intruder.sessionToken}` },
      });
      expect(unauthorizedDelete.statusCode).toBe(403);
      expect(unauthorizedDelete.json().error.code).toBe('FORBIDDEN');

      // 3. Owner deletes listing -> 200 OK
      const authorizedDelete = await app.inject({
        method: 'DELETE',
        url: `/api/listings/${listingId}`,
        headers: { authorization: `Bearer ${owner.sessionToken}` },
      });
      expect(authorizedDelete.statusCode).toBe(200);
      expect(authorizedDelete.json().success).toBe(true);

      // 4. Verify listing is gone -> 404 NOT_FOUND
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/listings/${listingId}`,
      });
      expect(getRes.statusCode).toBe(404);
    });
  });
});
