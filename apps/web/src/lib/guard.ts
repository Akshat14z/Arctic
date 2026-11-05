/** "2 lakh" → 200000, "1.5 crore" → 15000000; null if the text has no lakh/crore amount. */
export function indianAmount(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase().startsWith("l") ? 1e5 : 1e7;
  return Math.round(Number(m[1]) * unit);
}
