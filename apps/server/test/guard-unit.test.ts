import { describe, it, expect } from 'vitest';
import { analyzeMessageGuard } from '../src/services/guard.service.js';
import { translateText, translateForRecipients } from '../src/services/translation.service.js';

describe('Meaning Guard Engine Unit Tests (In-Memory)', () => {
  it('returns no issues for clean marketplace messages', () => {
    const result = analyzeMessageGuard('Hello, is this item still available?', 'en');
    expect(result.issues).toEqual([]);
    expect(result.blocking).toBe(false);
  });

  describe('Currency Ambiguity Rule', () => {
    it('flags bare numbers in price contexts and marks blocking', () => {
      const result = analyzeMessageGuard('I can give 1500 for this', 'en');
      expect(result.blocking).toBe(true);
      const issue = result.issues.find((i) => i.kind === 'currency');
      expect(issue).toBeDefined();
      expect(issue?.explanation.en).toBeDefined();
      expect(issue?.explanation.hi).toBeDefined();
      expect(issue?.explanation.ja).toBeDefined();
    });

    it('flags Indian numbering terms (lakh/crore) without currency symbol', () => {
      const result = analyzeMessageGuard('Will you take 2 lakh?', 'en');
      expect(result.blocking).toBe(true);
      const issue = result.issues.find((i) => i.kind === 'currency');
      expect(issue).toBeDefined();
      expect(issue?.span).toBe('2 lakh');
      expect(issue?.suggestion).toBe('₹2 lakh');
    });
  });

  describe('Scam Signals Rule', () => {
    it('flags off-platform messaging requests (WhatsApp / Telegram)', () => {
      const result1 = analyzeMessageGuard('Contact me on WhatsApp: +919876543210', 'en');
      expect(result1.blocking).toBe(true);
      expect(result1.issues.some((i) => i.kind === 'scam_signal')).toBe(true);

      const result2 = analyzeMessageGuard('ping on telegram t.me/seller123', 'en');
      expect(result2.blocking).toBe(true);
      expect(result2.issues.some((i) => i.kind === 'scam_signal')).toBe(true);
    });

    it('flags off-platform payment schemes (wire transfer / gift cards / crypto)', () => {
      const result = analyzeMessageGuard('Send payment via gift card or wire transfer', 'en');
      expect(result.blocking).toBe(true);
      expect(result.issues.some((i) => i.kind === 'scam_signal')).toBe(true);
    });
  });

  describe('Date & Delivery Ambiguity Rule', () => {
    it('flags vague delivery promises as non-blocking advice', () => {
      const result = analyzeMessageGuard('I will deliver tomorrow afternoon', 'en');
      expect(result.blocking).toBe(false);
      const issue = result.issues.find((i) => i.kind === 'date');
      expect(issue).toBeDefined();
      expect(issue?.span).toBe('tomorrow');
    });

    it('flags "in a few days" or "this weekend"', () => {
      const result = analyzeMessageGuard('Can we meet this weekend?', 'en');
      expect(result.blocking).toBe(false);
      expect(result.issues.some((i) => i.kind === 'date')).toBe(true);
    });
  });

  describe('Tone Guard Rule (D-024)', () => {
    it('flags demanding phrasing with softer suggestion and never blocks', () => {
      const result = analyzeMessageGuard('Give it to me now hurry up', 'en');
      expect(result.blocking).toBe(false);
      const issue = result.issues.find((i) => i.kind === 'tone');
      expect(issue).toBeDefined();
      expect(issue?.suggestion).toBe('Could you please consider this offer?');
    });
  });

  describe('Unit / Quantity Ambiguity Rule', () => {
    it('flags vague quantities as non-blocking advice', () => {
      const result = analyzeMessageGuard('I will take a few items', 'en');
      expect(result.blocking).toBe(false);
      expect(result.issues.some((i) => i.kind === 'unit')).toBe(true);
    });
  });
});

describe('Translation Service Unit Tests', () => {
  it('returns same text immediately when source and target languages match', async () => {
    const text = 'नमस्ते, यह उपलब्ध है';
    const translated = await translateText(text, 'hi', 'hi');
    expect(translated).toBe(text);
  });

  it('translates common dictionary terms for offline resilience', async () => {
    const translated = await translateText('hello', 'en', 'hi');
    expect(translated).toBe('नमस्ते');
  });

  it('translates for multiple recipients and includes all requested languages', async () => {
    const text = 'Thank you';
    const tr = await translateForRecipients(text, 'en', ['hi', 'ja']);
    expect(tr.hi).toBeDefined();
    expect(tr.ja).toBeDefined();
  }, 15000);
});


describe('Translation meaning check', () => {
  it('extracts the ₹ amounts a translation must keep word for word', async () => {
    const { rupeeAmounts } = await import('../src/services/translation.service.js');
    expect(rupeeAmounts('क्या आप ₹14,000 में देंगे? या ₹2,00,000?')).toEqual(['₹14,000', '₹2,00,000']);
    expect(rupeeAmounts('No amounts here')).toEqual([]);
  });
});

describe('Self-proving seal (DHRUMIL-T22)', () => {
  it('signs a compact payload that verifies with the published key, and detects tampering', async () => {
    const { createPublicKey, verify } = await import('crypto');
    const { sealPayload, signSeal, sealPublicKey, resetSealKeyForTesting } = await import('../src/services/seal-proof.js');
    resetSealKeyForTesting();
    const deal = {
      id: 'd1', listingId: 'l1', channelId: 'c1', sealCode: 's_abc',
      item: { en: 'Vintage Seiko', ja: 'セイコー' }, price: { amount: 15000, currency: 'INR' as const }, quantity: 1,
      delivery: { method: 'pickup' as const }, conditions: {}, agreedBy: { buyer: '2026-11-07T16:04:00.000Z', seller: '2026-11-07T16:04:30.000Z' },
      status: 'agreed' as const,
    };
    const token = signSeal(sealPayload(deal as never, { buyer: 'Priya', seller: 'Kenji' }, '2026-11-07T16:04:30.000Z'))!;
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/);
    const [body, sig] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    expect(payload).toMatchObject({ v: 1, c: 's_abc', i: 'Vintage Seiko', p: 15000, cur: 'INR', d: 'pickup', b: 'Priya', s: 'Kenji' });
    const pub = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: sealPublicKey()! }, format: 'jwk' });
    expect(verify(null, Buffer.from(body, 'base64url'), pub, Buffer.from(sig, 'base64url'))).toBe(true);
    // change the price: the signature no longer matches
    const forged = Buffer.from(JSON.stringify({ ...payload, p: 1500 })).toString('base64url');
    expect(verify(null, Buffer.from(forged, 'base64url'), pub, Buffer.from(sig, 'base64url'))).toBe(false);
  });

  it('signs nothing in production without SEAL_SIGNING_SEED', async () => {
    const { signSeal, sealPublicKey, resetSealKeyForTesting } = await import('../src/services/seal-proof.js');
    const { resetConfigForTesting } = await import('../src/config.js');
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.SEAL_SIGNING_SEED;
    resetConfigForTesting();
    resetSealKeyForTesting();
    try {
      expect(sealPublicKey()).toBeNull();
      expect(signSeal({ v: 1, c: 's', i: 'x', p: 1, cur: 'INR', q: 1, b: 'a', s: 'b', t: '2026-11-07T00:00:00.000Z' })).toBeNull();
    } finally {
      process.env.NODE_ENV = prev;
      resetConfigForTesting();
      resetSealKeyForTesting();
    }
  });
});
