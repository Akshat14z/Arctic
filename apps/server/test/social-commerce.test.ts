import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';

describe('Social commerce seller follows', { timeout: 90_000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('social_test_token');
  });

  async function user(name: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/guest',
      payload: { displayName: name, language: 'en' },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as { sessionToken: string; user: { id: string } };
  }

  async function listing(token: string, title: string, category = 'Electronics') {
    const response = await app.inject({
      method: 'POST',
      url: '/api/listings',
      headers: { authorization: `Bearer ${token}` },
      payload: { title, description: `${title} description`, price: { amount: 1200, currency: 'INR' }, category },
    });
    expect(response.statusCode).toBe(201);
    return response.json().listing as { id: string };
  }

  it('persists follows, prevents duplicates, reports accurate counts, and unfollows idempotently', async () => {
    const buyer = await user('Social Buyer A');
    const seller = await user('Social Seller A');

    const follow = () => app.inject({
      method: 'POST',
      url: `/api/sellers/${seller.user.id}/follow`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });

    const first = await follow();
    const duplicate = await follow();
    expect(first.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ isFollowing: true, followerCount: 1 });
    expect(duplicate.json()).toMatchObject({ isFollowing: true, followerCount: 1 });

    const status = await app.inject({
      method: 'GET',
      url: `/api/sellers/${seller.user.id}/follow-status`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(status.json()).toMatchObject({ isFollowing: true, followerCount: 1 });

    const remove = () => app.inject({
      method: 'DELETE',
      url: `/api/sellers/${seller.user.id}/follow`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect((await remove()).json()).toMatchObject({ isFollowing: false, followerCount: 0 });
    expect((await remove()).json()).toMatchObject({ isFollowing: false, followerCount: 0 });
  });

  it('rejects self-following and requires authentication', async () => {
    const seller = await user('Social Seller B');
    const self = await app.inject({
      method: 'POST',
      url: `/api/sellers/${seller.user.id}/follow`,
      headers: { authorization: `Bearer ${seller.sessionToken}` },
    });
    expect(self.statusCode).toBe(400);
    expect(self.json().error.code).toBe('SELF_FOLLOW');

    const anonymous = await app.inject({ method: 'POST', url: `/api/sellers/${seller.user.id}/follow` });
    expect(anonymous.statusCode).toBe(401);
  });

  it('updates preferences only for an existing follow', async () => {
    const buyer = await user('Social Buyer C');
    const seller = await user('Social Seller C');

    const missing = await app.inject({
      method: 'PATCH',
      url: `/api/sellers/${seller.user.id}/follow-preferences`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { notificationFrequency: 'daily' },
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('FOLLOW_NOT_FOUND');

    await app.inject({
      method: 'POST',
      url: `/api/sellers/${seller.user.id}/follow`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/sellers/${seller.user.id}/follow-preferences`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { notifyNewListings: false, notificationFrequency: 'daily' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().preferences).toEqual({
      notifyNewListings: false,
      notifyPriceChanges: true,
      notificationFrequency: 'daily',
    });
  });

  it('returns a public-safe storefront with active listings and category pagination', async () => {
    const seller = await user('Social Seller D');
    await listing(seller.sessionToken, 'First camera', 'Cameras');
    await listing(seller.sessionToken, 'Second camera', 'Cameras');

    const first = await app.inject({ method: 'GET', url: `/api/sellers/${seller.user.id}?limit=1` });
    expect(first.statusCode).toBe(200);
    const body = first.json();
    expect(body.seller).toMatchObject({ activeListingCount: 2, categories: ['Cameras'], isVerified: false });
    expect(body.listings).toHaveLength(1);
    expect(body.nextCursor).toBeTruthy();
    expect(body.seller).not.toHaveProperty('email');
    expect(body.seller).not.toHaveProperty('passwordHash');

    const second = await app.inject({ method: 'GET', url: `/api/sellers/${seller.user.id}?limit=1&cursor=${body.nextCursor}` });
    expect(second.statusCode).toBe(200);
    expect(second.json().listings).toHaveLength(1);
    expect(second.json().listings[0].id).not.toBe(body.listings[0].id);
  });

  it('feeds only active listings from followed sellers and paginates', async () => {
    const buyer = await user('Social Buyer E');
    const followed = await user('Followed Seller E');
    const other = await user('Other Seller E');
    await listing(followed.sessionToken, 'Followed one');
    await listing(followed.sessionToken, 'Followed two');
    await listing(other.sessionToken, 'Should not appear');
    await app.inject({
      method: 'POST',
      url: `/api/sellers/${followed.user.id}/follow`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });

    const first = await app.inject({
      method: 'GET',
      url: '/api/following/feed?limit=1',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().items).toHaveLength(1);
    expect(first.json().items[0].seller.id).toBe(followed.user.id);
    expect(first.json().nextCursor).toBeTruthy();

    const second = await app.inject({
      method: 'GET',
      url: `/api/following/feed?limit=1&cursor=${first.json().nextCursor}`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().items).toHaveLength(1);
    expect(second.json().items[0].seller.id).toBe(followed.user.id);
  });

  it('searches public sellers without exposing private account data', async () => {
    const buyer = await user('Search Buyer G');
    const seller = await user('Blue Bicycle Studio');
    await listing(seller.sessionToken, 'City bicycle', 'Bicycles');

    const response = await app.inject({
      method: 'GET',
      url: '/api/sellers/search?q=Blue%20Bicycle',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(response.statusCode).toBe(200);
    const match = response.json().items.find((item: { id: string }) => item.id === seller.user.id);
    expect(match).toMatchObject({ displayName: 'Blue Bicycle Studio', activeListingCount: 1 });
    expect(match).not.toHaveProperty('email');
    expect(match).not.toHaveProperty('passwordHash');
    expect(response.json().items.some((item: { id: string }) => item.id === buyer.user.id)).toBe(false);
  });

  it('persists deduplicated in-app notifications and honors seller preferences', async () => {
    const buyer = await user('Social Buyer F');
    const seller = await user('Social Seller F');
    await app.inject({
      method: 'POST',
      url: `/api/sellers/${seller.user.id}/follow`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });

    const product = await listing(seller.sessionToken, 'Notification camera');
    const initial = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json().items).toHaveLength(1);
    expect(initial.json().items[0]).toMatchObject({ type: 'new_listing', listingId: product.id });
    expect(initial.json().unreadCount).toBe(1);

    const saved = await app.inject({
      method: 'POST',
      url: `/api/watchlist/${product.id}`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ saved: true, listingId: product.id });

    await app.inject({
      method: 'PATCH',
      url: `/api/listings/${product.id}`,
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: { price: { amount: 1000, currency: 'INR' } },
    });
    // Repeating the same price event cannot create a second notification.
    await app.inject({
      method: 'PATCH',
      url: `/api/listings/${product.id}`,
      headers: { authorization: `Bearer ${seller.sessionToken}` },
      payload: { price: { amount: 1000, currency: 'INR' } },
    });
    const changed = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    // Following + Watchlist converge on the same source-neutral dedupe key.
    expect(changed.json().items.filter((item: { type: string }) => item.type === 'price_change')).toHaveLength(1);

    const notificationId = changed.json().items[0].id;
    const read = await app.inject({
      method: 'PATCH',
      url: `/api/notifications/${notificationId}/read`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(read.statusCode).toBe(200);

    await app.inject({
      method: 'PATCH',
      url: `/api/sellers/${seller.user.id}/follow-preferences`,
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
      payload: { notifyNewListings: false },
    });
    await listing(seller.sessionToken, 'Muted camera');
    const muted = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${buyer.sessionToken}` },
    });
    expect(muted.json().items).toHaveLength(2);
  });
});
