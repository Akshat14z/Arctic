import type { LangCode } from '@convocart/contracts';
import { getConfig } from '../config.js';
import { geminiGenerate } from './gemini.js';

export interface ITranslationService {
  translate(text: string, from: LangCode, to: LangCode): Promise<string>;
}

function makeDict(en: string, hi: string, ja: string): Record<LangCode, string> {
  return {
    en,
    hi,
    ja,
    ta: hi,
    te: hi,
    kn: hi,
    bn: hi,
    mr: hi,
  };
}

// Built-in dictionary for offline / test mock translations of common marketplace terms
const COMMON_DICTIONARY: Record<string, Record<LangCode, string>> = {
  'hello': makeDict('Hello', 'नमस्ते', 'こんにちは'),
  'is this available?': makeDict('Is this available?', 'क्या यह उपलब्ध है?', 'これは利用可能ですか？'),
  'what is the final price?': makeDict('What is the final price?', 'अंतिम कीमत क्या है?', '最終価格はいくらですか？'),
  'i will buy it': makeDict('I will buy it', 'मैं इसे खरीदूंगा', '購入します'),
  'thank you': makeDict('Thank you', 'धन्यवाद', 'ありがとうございます'),
  'deal': makeDict('Deal', 'सौदा तय', '取引成立'),
};

const LANG_LABELS: Record<LangCode, string> = {
  en: 'EN',
  hi: 'HI',
  ja: 'JA',
  ta: 'TA',
  te: 'TE',
  kn: 'KN',
  bn: 'BN',
  mr: 'MR',
};

/** Translates with Gemini (model chain + per-model budget in gemini.ts). */
async function translateWithGemini(text: string, from: LangCode, to: LangCode): Promise<string> {
  const prompt = `You are a real-time translation engine for Handshake, a cross-language marketplace.
Translate the following message directly from language code '${from}' to '${to}'.
Guidelines:
- Keep every amount and currency symbol exactly as written: "₹14,000" stays "₹14,000". Never convert currencies or units.
- Preserve numbers and proper nouns.
- Keep the natural, concise conversational tone of buyer-seller negotiation.
- Output ONLY the translated text without extra formatting, explanations, or quotes.

Message:
${text}`;
  const out = await geminiGenerate([{ text: prompt }], { maxOutputTokens: 512, timeoutMs: 3500 });
  // Meaning check: every rupee amount in the source must survive word for word (a model once turned ₹14,000 into 14,000円).
  const missing = rupeeAmounts(text).filter((amt) => !out.replace(/\s/g, '').includes(amt));
  if (missing.length) throw new Error(`translation changed an amount (${missing.join(', ')})`);
  return out;
}

/** "₹14,000", "Rs 500", "INR 2,00,000" → the digits with their ₹ form, e.g. ["₹14,000"]. */
export function rupeeAmounts(text: string): string[] {
  return [...text.matchAll(/(?:₹|\bRs\.?|\bINR)\s?(\d[\d,]*(?:\.\d+)?)/gi)].map((m) => `₹${m[1]}`).filter((a) => text.includes(a));
}

/**
 * Fallback translator for local tests or offline environments.
 */
function translateWithFallback(text: string, from: LangCode, to: LangCode): string {
  const lower = text.trim().toLowerCase();
  if (COMMON_DICTIONARY[lower] && COMMON_DICTIONARY[lower][to]) {
    return COMMON_DICTIONARY[lower][to];
  }

  return `[${LANG_LABELS[to]}] ${text}`;
}

const TRANSLATION_CACHE = new Map<string, string>();

/**
 * Main translation function with automatic failover and budget control.
 * Follows ARCHITECTURE §4.2: "Degrade, never block".
 */
export async function translateText(text: string, from: LangCode, to: LangCode): Promise<string | null> {
  if (from === to || !text.trim()) {
    return text;
  }

  const cacheKey = `${from}:${to}:${text.trim().toLowerCase()}`;
  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey)!;
  }

  const config = getConfig();

  // In test environment, use fast offline translation unless in live dev/production
  if (config.NODE_ENV !== 'test' && config.LLM_API_KEY) {
    try {
      const translated = await translateWithGemini(text, from, to);
      TRANSLATION_CACHE.set(cacheKey, translated);
      return translated;
    } catch (err) {
      console.warn(`[Translation] Gemini failed (${from}->${to}):`, err instanceof Error ? err.message : err);
      // Never show a fake "[JA] …" translation to a real reader: leave the language out, the reader sees the original.
      const dict = COMMON_DICTIONARY[text.trim().toLowerCase()]?.[to];
      return dict ?? null;
    }
  }

  const fallback = translateWithFallback(text, from, to);
  return fallback;
}

/**
 * Translates message text into each recipient's language.
 * A language whose translation failed is left out, so its reader sees the original (C4 render rule).
 */
export async function translateForRecipients(
  text: string,
  senderLang: LangCode,
  recipientLangs: LangCode[]
): Promise<Record<LangCode, string>> {
  const uniqueLangs = Array.from(new Set(recipientLangs));
  const translations: Partial<Record<LangCode, string>> = {};

  await Promise.all(
    uniqueLangs.map(async (targetLang) => {
      try {
        const t = await translateText(text, senderLang, targetLang);
        if (t !== null) translations[targetLang] = t;
      } catch (err) {
        console.warn(`[Translation] Failed to translate for ${targetLang}, falling back to original:`, err);
        translations[targetLang] = text;
      }
    })
  );

  return translations as Record<LangCode, string>;
}
