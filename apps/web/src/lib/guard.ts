/** "2 lakh" → 200000, "1.5 crore" → 15000000; null if the text has no lakh/crore amount. */
export function indianAmount(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase().startsWith("l") ? 1e5 : 1e7;
  return Math.round(Number(m[1]) * unit);
}

/**
 * The exact amount a flagged span means, and the words to put in its place: the span with only the amount rewritten,
 * so accepting a suggestion keeps the sentence ("I can pay 17000" → "I can pay ₹17,000", not "I can ₹17000").
 *   "2 lakh" → 200000 · "17k", "17 thousand", "17 हज़ार" → 17000 · "pay 17000" → 17000
 */
export function amountFix(span: string, format: (amount: number) => string): { amount: number; replacement: string } | null {
  const lakh = span.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/i);
  if (lakh) {
    const amount = Math.round(Number(lakh[1]) * (lakh[2].toLowerCase().startsWith("l") ? 1e5 : 1e7));
    return { amount, replacement: span.replace(lakh[0], format(amount)) };
  }
  const thousand = span.match(/(\d+(?:\.\d+)?)\s*(k|thousand|हज़ार|हजार)(?![a-z])/i);
  if (thousand) {
    const amount = Math.round(Number(thousand[1]) * 1000);
    return { amount, replacement: span.replace(thousand[0], format(amount)) };
  }
  const bare = span.match(/(\d{2,7})\s*$/);
  if (bare) {
    const amount = Number(bare[1]);
    return { amount, replacement: span.slice(0, bare.index) + format(amount) };
  }
  return null;
}
