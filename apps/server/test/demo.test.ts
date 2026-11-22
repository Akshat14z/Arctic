import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { resetConfigForTesting } from '../src/config.js';
import { prisma } from '../src/db/prisma.js';

describe('Demo Sandbox Sessions (AKSHAT-T13, D-015)', { timeout: 35000 }, () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_nexconn_token_for_demo');
  });

  it('provisions demo buyer session with seeded state and fixed user ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demo/session',
      payload: { as: 'buyer' },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.sessionToken).toBeDefined();
    expect(data.user.id).toBe('demo_u_buyer');
    expect(data.user.displayName).toContain('Priya');
    expect(data.user.language).toBe('hi');
    expect(data.user.isDemo).toBe(true);
    expect(data.user.role).toBe('user');
    expect(data.nexconn).toBeDefined();

    // Verify session is valid in DB
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: `Bearer ${data.sessionToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.id).toBe('demo_u_buyer');
  });

  it('provisions demo seller session and verifies demo listing exists', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demo/session',
      payload: { as: 'seller' },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.user.id).toBe('demo_u_seller');
    expect(data.user.language).toBe('ja');
    expect(data.user.isDemo).toBe(true);

    // Verify demo listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: 'demo_l_vintage_watch' },
    });
    expect(listing).toBeDefined();
    expect(listing?.sellerId).toBe('demo_u_seller');
  });

  it('provisions demo support agent session with multilingual capability', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demo/session',
      payload: { as: 'agent' },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.user.id).toBe('demo_u_agent');
    expect(data.user.role).toBe('agent');
    expect(data.user.agentLanguages).toContain('hi');
    expect(data.user.agentLanguages).toContain('ja');

    // Agent can access agent queue
    const queueRes = await app.inject({
      method: 'GET',
      url: '/api/agent/queue',
      headers: { authorization: `Bearer ${data.sessionToken}` },
    });
    expect(queueRes.statusCode).toBe(200);
    expect(queueRes.json().items).toBeDefined();
  });

  it('strictly reuses fixed demo identities without creating duplicate accounts (D-015)', async () => {
    const beforeCount = await prisma.user.count({
      where: { id: { startsWith: 'demo_' } },
    });

    // Call demo session repeatedly
    await app.inject({ method: 'POST', url: '/api/demo/session', payload: { as: 'buyer' } });
    await app.inject({ method: 'POST', url: '/api/demo/session', payload: { as: 'seller' } });
    await app.inject({ method: 'POST', url: '/api/demo/session', payload: { as: 'agent' } });

    const afterCount = await prisma.user.count({
      where: { id: { startsWith: 'demo_' } },
    });

    // Maximum 3 demo users exist, no throwaways
    expect(afterCount).toBeLessThanOrEqual(3);
    expect(afterCount).toBe(beforeCount);
  });

  it('demo accounts are read-only: no rename, language change or password (DHRUMIL-030)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/demo/session', payload: { as: 'buyer' } });
    const { sessionToken } = res.json();
    for (const payload of [{ displayName: 'Hacked' }, { language: 'en' }, { email: 'x@example.test', newPassword: 'longenough1' }]) {
      const patch = await app.inject({ method: 'PATCH', url: '/api/me', headers: { authorization: `Bearer ${sessionToken}` }, payload });
      expect(patch.statusCode).toBe(403);
      expect(patch.json().error.code).toBe('DEMO_READ_ONLY');
    }
    const me = await prisma.user.findUniqueOrThrow({ where: { id: 'demo_u_buyer' } });
    expect(me.displayName).toContain('Priya');
    expect(me.language).toBe('hi');
    expect(me.email).toBeNull();
  });

  it('seeded demo listings cannot be edited or deleted, even by the demo seller', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/demo/session', payload: { as: 'seller' } });
    const auth = { authorization: `Bearer ${res.json().sessionToken}` };
    const patch = await app.inject({ method: 'PATCH', url: '/api/listings/demo_l_vintage_watch', headers: auth, payload: { price: { amount: 1, currency: 'INR' } } });
    expect(patch.statusCode).toBe(403);
    const del = await app.inject({ method: 'DELETE', url: '/api/listings/demo_l_vintage_watch', headers: auth });
    expect(del.statusCode).toBe(403);
    expect(await prisma.listing.count({ where: { id: 'demo_l_vintage_watch' } })).toBe(1);
  });
});
