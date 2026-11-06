import type { LangCode } from '@convocart/contracts';
import { getConfig } from '../config.js';

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

/**
 * Translates text using Google Gemini LLM API when configured.
 * Implements a strict timeout budget so chat preparation never hangs.
 */
async function translateWithGemini(
  text: string,
  from: LangCode,
  to: LangCode,
  apiKey: string,
  model: string
): Promise<string> {
  const primaryModel = model.includes('3.5') ? 'gemini-2.0-flash' : model;
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'])
  ).filter(Boolean);

  const prompt = `You are a real-time translation engine for Handshake, a cross-language marketplace.
Translate the following message directly from language code '${from}' to '${to}'.
Guidelines:
- Preserve currency figures, numbers, and proper nouns.
- Keep the natural, concise conversational tone of buyer-seller negotiation.
- Output ONLY the translated text without extra formatting, explanations, or quotes.

Message:
${text}`;

  for (const candidate of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s budget per candidate model

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[Translation] Model ${candidate} returned ${response.status}. Trying next fallback model.`);
        continue;
      }

      const data = (await response.json()) as any;
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText && typeof candidateText === 'string') {
        return candidateText.trim();
      }
    } catch (err: unknown) {
      console.warn(`[Translation] Model ${candidate} attempt failed:`, err instanceof Error ? err.message : err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('All Gemini candidate translation models failed or returned empty response');
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
export async function translateText(text: string, from: LangCode, to: LangCode): Promise<string> {
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
      const translated = await translateWithGemini(text, from, to, config.LLM_API_KEY, config.LLM_MODEL);
      TRANSLATION_CACHE.set(cacheKey, translated);
      return translated;
    } catch (err) {
      console.warn(`[Translation] Gemini call failed or timed out (${from}->${to}):`, err instanceof Error ? err.message : err);
      // Fallback to local translation
    }
  }

  const fallback = translateWithFallback(text, from, to);
  return fallback;
}

/**
 * Translates message text into each recipient's language.
 * Guarantees every requested recipient language is populated in the returned record.
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
        translations[targetLang] = await translateText(text, senderLang, targetLang);
      } catch (err) {
        console.warn(`[Translation] Failed to translate for ${targetLang}, falling back to original:`, err);
        translations[targetLang] = text;
      }
    })
  );

  return translations as Record<LangCode, string>;
}
