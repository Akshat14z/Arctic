import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Health and Error Handling Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with structured status payload', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('convocart-server');
    expect(body.version).toBe('0.1.0');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptimeSeconds');
  });

  it('unmatched route returns standard 404 C1 error response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('/non-existent-route');
    expect(body.error.retryable).toBe(false);
  });
});
