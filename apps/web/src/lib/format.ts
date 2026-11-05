import type { LangCode, Money } from "@convocart/contracts";

/** Indian languages format in en-IN style grouping (₹2,00,000), so "2 lakh" reads the same to everyone. */
export const localeFor = (lang: LangCode) => (lang === "ja" ? "ja-JP" : `${lang}-IN`);

export function formatPrice({ amount, currency }: Money, lang: LangCode): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: "currency",
    currency,
    numberingSystem: "latn", // bn/mr default to native digits; both sides must see the same digits
    minimumFractionDigits: 0, // ₹1,85,000 not ₹1,85,000.00
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}
