import { SUPPORTED_LANGUAGES, type LangCode } from "@convocart/contracts";

const english = new Intl.DisplayNames(["en"], { type: "language" });

/** Each language's own name ("हिन्दी") plus its English name ("Hindi"), via the browser's Intl data. */
export const LANGUAGES = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  native: new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code,
  english: english.of(code) ?? code,
}));

/** First supported language in the browser's preference list, else English. */
export function preferredLanguage(prefs: readonly string[]): LangCode {
  for (const p of prefs) {
    const base = p.toLowerCase().split("-")[0];
    const hit = SUPPORTED_LANGUAGES.find((c) => c === base);
    if (hit) return hit;
  }
  return "en";
}
