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
