import { describe, expect, it } from 'vitest';
import { factualSummary, summarizeCase } from '../src/services/case-summary.js';

const base = {
  caseId: 'c_test',
  reason: 'item_not_as_described' as const,
  status: 'open',
  buyer: { id: 'demo_u_buyer', displayName: 'Priya' },
  seller: { id: 'demo_u_seller', displayName: 'Kenji' },
  deal: {
    id: 'd_1', channelId: 'ch_demo_watch_5', listingId: 'demo_l_vintage_watch', status: 'agreed' as const,
    item: { en: 'Vintage Seiko Automatic Watch (1978)' }, price: { amount: 15000, currency: 'INR' as const }, quantity: 1,
    delivery: { method: 'pickup' as const }, conditions: { en: ['Item matches listing description'] },
    agreedBy: { buyer: '2026-11-07T16:04:00.000Z', seller: '2026-11-07T16:03:00.000Z' },
  },
  lines: [
    { from: 'demo_u_buyer', origLang: 'hi', origText: 'क्या आप ₹14,000 में देंगे?', tr: { en: 'Will you give it for ₹14,000?' } },
    { from: 'demo_u_seller', origLang: 'ja', origText: '₹15,000が最終価格です。', tr: { en: '₹15,000 is my final price.' } },
  ],
  lang: 'en' as const,
};

describe('case summary', () => {
  it('states the claim against the agreed terms, with no internal ids', () => {
    const s = factualSummary(base as never);
    expect(s.text).toContain("Priya says the item isn't as described");
    expect(s.text).toContain('₹15,000');
    expect(s.keyFacts.join(' ')).toContain('Item matches listing description');
    expect(`${s.text} ${s.keyFacts.join(' ')}`).not.toMatch(/\b(ch|c|d|u)_[a-z0-9_]{3,}/);
  });

  it('says plainly when there is no agreed deal', () => {
    expect(factualSummary({ ...base, deal: undefined } as never).text).toContain('no agreed deal');
  });

  it('never calls the model under tests', async () => {
    expect(await summarizeCase(base as never)).toEqual(factualSummary(base as never));
  });
});
