import { getConfig } from '../config.js';

/**
 * One Gemini call with a model fallback chain, shared by translation and voice transcription.
 * Measured 2026-11-07 for our key: gemini-flash-lite-latest ~1.3 s, gemini-3.5-flash with thinking off ~1.2 s;
 * the 2.0 / 2.5 / 1.5 models return 404 (retired), so they are not in the chain.
 */
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash'];

// Thinking models answer faster with thinking off; flash-lite-latest rejects the field (HTTP 400).
const supportsThinkingConfig = (model: string) => /gemini-(2\.5|3)/.test(model);

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function geminiGenerate(
  parts: Part[],
  opts: { maxOutputTokens: number; timeoutMs: number; temperature?: number }
): Promise<string> {
  const { LLM_API_KEY, LLM_MODEL } = getConfig();
  if (!LLM_API_KEY) throw new Error('LLM_API_KEY not set');
  const models = Array.from(new Set([LLM_MODEL, ...FALLBACK_MODELS].filter(Boolean)));

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${LLM_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: opts.temperature ?? 0.2,
            maxOutputTokens: opts.maxOutputTokens,
            ...(supportsThinkingConfig(model) && { thinkingConfig: { thinkingBudget: 0 } }),
          },
        }),
      });
      if (!res.ok) {
        console.warn(`[Gemini] ${model} returned ${res.status}; trying the next model`);
        continue;
      }
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
      if (text) return text;
    } catch (err) {
      console.warn(`[Gemini] ${model} failed:`, err instanceof Error ? err.message : err);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Every Gemini model failed or returned nothing');
}
