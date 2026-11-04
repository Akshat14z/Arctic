import { describe, it, expect } from 'vitest';
import { prisma } from '../src/db/prisma.js';

describe('Prisma Database Schema & Client Verification', () => {
  it('instantiates Prisma Client singleton with all architectural models', () => {
    expect(prisma).toBeDefined();

    // Verify all 9 required models have initialized client delegates
    expect(prisma.user).toBeDefined();
    expect(prisma.session).toBeDefined();
    expect(prisma.listing).toBeDefined();
    expect(prisma.listingTranslation).toBeDefined();
    expect(prisma.chat).toBeDefined();
    expect(prisma.deal).toBeDefined();
    expect(prisma.case).toBeDefined();
    expect(prisma.transcriptLine).toBeDefined();
    expect(prisma.webhookNonce).toBeDefined();
  });

  it('exposes correct query methods on model delegates', () => {
    expect(typeof prisma.user.findUnique).toBe('function');
    expect(typeof prisma.user.create).toBe('function');
    expect(typeof prisma.session.findUnique).toBe('function');
    expect(typeof prisma.listing.findMany).toBe('function');
    expect(typeof prisma.chat.findUnique).toBe('function');
    expect(typeof prisma.deal.findUnique).toBe('function');
    expect(typeof prisma.case.findMany).toBe('function');
    expect(typeof prisma.transcriptLine.create).toBe('function');
    expect(typeof prisma.webhookNonce.findUnique).toBe('function');
  });
});

