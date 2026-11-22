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

// Hedged requests (DHRUMIL-T34, approved by the humans): if a model hasn't answered within HEDGE_MS, the next one
// starts in parallel and the first non-empty answer wins. Measured 2026-11-22: gemini-3.5-flash timed out at 3.5 s
// on Hindi→Japanese 3 times in 3, so a sequential chain left Japanese readers with the untranslated original.
const HEDGE_MS = 1500;

async function callModel(model: string, parts: Part[], opts: { maxOutputTokens: number; temperature?: number }, key: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxOutputTokens,
        ...(supportsThinkingConfig(model) && { thinkingConfig: { thinkingBudget: 0 } }),
      },
    }),
  });
  if (!res.ok) throw new Error(`returned ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('returned nothing');
  return text;
}

export async function geminiGenerate(
  parts: Part[],
  opts: { maxOutputTokens: number; timeoutMs: number; temperature?: number }
): Promise<string> {
  const { LLM_API_KEY, LLM_MODEL } = getConfig();
  if (!LLM_API_KEY) throw new Error('LLM_API_KEY not set');
  const models = Array.from(new Set([LLM_MODEL, ...FALLBACK_MODELS].filter(Boolean))) as string[];

  return new Promise<string>((resolve, reject) => {
    let next = 0;
    let pending = 0;
    let done = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const controllers: AbortController[] = [];
    const finish = (fn: () => void) => { done = true; clearTimeout(hedge); controllers.forEach((c) => c.abort()); fn(); };
    const launch = () => {
      clearTimeout(hedge);
      if (done) return;
      if (next >= models.length) {
        if (pending === 0) finish(() => reject(new Error('Every Gemini model failed or returned nothing')));
        return;
      }
      const model = models[next++];
      const controller = new AbortController();
      controllers.push(controller);
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      pending++;
      callModel(model, parts, opts, LLM_API_KEY, controller.signal)
        .then((text) => { if (!done) finish(() => resolve(text)); })
        .catch((err) => { if (!done) console.warn(`[Gemini] ${model} failed:`, err instanceof Error ? err.message : err); })
        .finally(() => { clearTimeout(timer); pending--; if (!done) launch(); });
      hedge = setTimeout(launch, HEDGE_MS);
    };
    launch();
  });
}
