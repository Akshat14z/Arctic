import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import * as nexconnTokens from '../src/nexconn/tokens.js';
import { getConfig, resetConfigForTesting } from '../src/config.js';

describe('Auth & Session API Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    // Default mock for token generation to keep tests fast and isolated
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_nexconn_access_token_123');
  });

  describe('POST /api/auth/guest', () => {
    it('successfully onboard guest user and returns session and Nexconn credentials', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: {
          displayName: 'Priya Sharma',
          language: 'hi',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();

      expect(data.sessionToken).toBeDefined();
      expect(typeof data.sessionToken).toBe('string');
      expect(data.sessionToken.length).toBeGreaterThan(20);

      expect(data.user).toBeDefined();
      expect(data.user.id).toMatch(/^u_/);
      expect(data.user.displayName).toBe('Priya Sharma');
      expect(data.user.language).toBe('hi');
      expect(data.user.role).toBe('user');
      expect(data.user.isDemo).toBe(false);

      expect(data.nexconn).toBeDefined();
      expect(data.nexconn.token).toBe('test_nexconn_access_token_123');
      expect(data.nexconn.area).toBe('SG');
    });

    it('rejects invalid payload with C1 VALIDATION_ERROR (400)', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: {
          displayName: '', // empty
          language: 'unsupported_lang',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.retryable).toBe(false);
    });
  });

  describe('POST /api/auth/agent', () => {
    it('registers agent with valid agent access code', async () => {
      const app = await buildApp();
      const config = getConfig();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/agent',
        payload: {
          displayName: 'Agent Vikram',
          language: 'en',
          agentLanguages: ['en', 'hi', 'ta'],
          code: config.AGENT_ACCESS_CODE,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();

      expect(data.user.role).toBe('agent');
      expect(data.user.agentLanguages).toEqual(['en', 'hi', 'ta']);
      expect(data.user.displayName).toBe('Agent Vikram');
      expect(data.sessionToken).toBeDefined();
    });

    it('rejects agent registration with invalid code (403 BAD_AGENT_CODE)', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/agent',
        payload: {
          displayName: 'Fraud Agent',
          language: 'en',
          agentLanguages: ['en'],
          code: 'wrong_secret_code',
        },
      });

      expect(response.statusCode).toBe(403);
      const data = response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('BAD_AGENT_CODE');
      expect(data.error.retryable).toBe(false);
    });
  });

  describe('GET /api/me & PATCH /api/me', () => {
    it('rejects unauthenticated request to /api/me with 401 UNAUTHORIZED', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with invalid token with 401 UNAUTHORIZED', async () => {
      const app = await buildApp();

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: 'Bearer non_existent_token_string',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('authenticates valid session and returns profile on GET /api/me', async () => {
      const app = await buildApp();

      // 1. Sign up as guest
      const guestRes = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: {
          displayName: 'Arjun Verma',
          language: 'kn',
        },
      });
      const authData = guestRes.json();
      const token = authData.sessionToken;

      // 2. Fetch /api/me with Bearer token
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meData = meRes.json();
      expect(meData.user.id).toBe(authData.user.id);
      expect(meData.user.displayName).toBe('Arjun Verma');
      expect(meData.user.language).toBe('kn');
      expect(meData.nexconn.token).toBe('test_nexconn_access_token_123');
    });

    it('updates user profile via PATCH /api/me', async () => {
      const app = await buildApp();

      // 1. Sign up as guest
      const guestRes = await app.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: {
          displayName: 'Original Name',
          language: 'en',
        },
      });
      const token = guestRes.json().sessionToken;

      // 2. Update via PATCH
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          displayName: 'Updated Name',
          language: 'ja',
        },
      });

      expect(patchRes.statusCode).toBe(200);
      const patchData = patchRes.json();
      expect(patchData.user.displayName).toBe('Updated Name');
      expect(patchData.user.language).toBe('ja');
    });
  });
});


describe('Email + password accounts (DHRUMIL-T21)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetConfigForTesting();
    vi.spyOn(nexconnTokens, 'issueNexconnToken').mockResolvedValue('test_nexconn_access_token_123');
  });
  const email = () => `t21_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

  it('signs up, refuses a second account on the same email, and signs back in', async () => {
    const app = await buildApp();
    const e = email();
    const up = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { displayName: 'Asha', language: 'hi', email: e.toUpperCase(), password: 'correct-horse' } });
    expect(up.statusCode).toBe(201);
    const body = up.json();
    expect(body.email).toBe(e); // stored lower-cased
    expect(body.user.email).toBeUndefined(); // never on the public User
    expect(body.user.passwordHash).toBeUndefined();

    const again = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { displayName: 'Other', language: 'en', email: e, password: 'another-pass' } });
    expect(again.statusCode).toBe(409);

    const inn = await app.inject({ method: 'POST', url: '/api/auth/signin', payload: { email: e, password: 'correct-horse' } });
    expect(inn.statusCode).toBe(200);
    expect(inn.json().user.id).toBe(body.user.id);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const app = await buildApp();
    const e = email();
    await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { displayName: 'Ravi', language: 'en', email: e, password: 'correct-horse' } });
    const wrong = await app.inject({ method: 'POST', url: '/api/auth/signin', payload: { email: e, password: 'nope-nope' } });
    const unknown = await app.inject({ method: 'POST', url: '/api/auth/signin', payload: { email: email(), password: 'nope-nope' } });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });

  it('upgrades a signed-in guest into an account, keeping the same user', async () => {
    const app = await buildApp();
    const guest = (await app.inject({ method: 'POST', url: '/api/auth/guest', payload: { displayName: 'Guest G', language: 'ja' } })).json();
    const up = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers: { authorization: `Bearer ${guest.sessionToken}` },
      payload: { displayName: 'Guest G', language: 'ja', email: email(), password: 'correct-horse' },
    });
    expect(up.statusCode).toBe(201);
    expect(up.json().user.id).toBe(guest.user.id);
  });

  it('rejects short passwords and bad emails with a validation error', async () => {
    const app = await buildApp();
    const short = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { displayName: 'A', language: 'en', email: email(), password: 'short' } });
    const bad = await app.inject({ method: 'POST', url: '/api/auth/signup', payload: { displayName: 'A', language: 'en', email: 'not-an-email', password: 'long-enough-1' } });
    expect(short.statusCode).toBe(400);
    expect(bad.statusCode).toBe(400);
  });
});
