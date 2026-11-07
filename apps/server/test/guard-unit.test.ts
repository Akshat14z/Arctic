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
