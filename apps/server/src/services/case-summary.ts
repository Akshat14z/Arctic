import type { CaseReason, CaseSummary, Deal, LangCode } from '@convocart/contracts';
import { geminiGenerate } from './gemini.js';

/**
 * The agent's case summary: what the buyer is claiming, set against the deal both sides agreed to.
 * Gemini writes it from the transcript and the frozen deal; if the model is slow or down, a factual summary built
 * from the same data stands in. Never shows internal ids.
 */

export interface SummaryInput {
  caseId: string;
  reason: CaseReason;
  status: string;
  resolution?: string | null;
  buyer: { id: string; displayName: string };
  seller: { id: string; displayName: string };
  deal?: Deal;
  lines: { from: string; origLang: string; origText: string; tr: Partial<Record<LangCode, string>> }[];
  lang: LangCode; // the reader (agent) language
}

const REASON: Record<CaseReason, string> = {
  item_not_as_described: "the item isn't as described",
  misunderstanding: 'they misunderstood each other',
  payment_issue: "there's a problem with payment",
  scam_suspected: 'this may be a scam',
  other: 'something else went wrong',
};

const money = (d: Deal) => `${d.price.currency === 'INR' ? '₹' : `${d.price.currency} `}${d.price.amount.toLocaleString('en-IN')}`;
const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : null;

/** Deterministic summary from the case data alone. Always available, never invents anything. */
export function factualSummary(s: SummaryInput): Pick<CaseSummary, 'text' | 'keyFacts'> {
  const d = s.deal;
  const item = d ? d.item.en ?? Object.values(d.item)[0] : undefined;
  const terms = d ? (d.conditions.en ?? Object.values(d.conditions)[0] ?? []) : [];
  const text =
    `${s.buyer.displayName} says ${REASON[s.reason]}.` +
    (d && d.status === 'agreed'
      ? ` Both sides agreed to ${item} for ${money(d)}${d.delivery ? `, ${d.delivery.method === 'pickup' ? 'picked up in person' : 'delivered'}` : ''}.`
      : ' There is no agreed deal in this chat.') +
    (s.resolution ? ` Resolution: ${s.resolution}` : '');
  const langs = Array.from(new Set(s.lines.map((l) => l.origLang)));
  const keyFacts = [
    ...(d && d.status === 'agreed'
      ? [`Agreed price: ${money(d)} (buyer ${day(d.agreedBy.buyer) ?? 'n/a'}, seller ${day(d.agreedBy.seller) ?? 'n/a'})`]
      : []),
    ...(terms.length ? [`Agreed terms: ${terms.join('; ')}`] : []),
    `${s.lines.length} message${s.lines.length === 1 ? '' : 's'} before help${langs.length ? `, written in ${langs.join(' and ')}` : ''}`,
  ];
  return { text, keyFacts };
}

// ponytail: per-process cache; one model call per case per new message. A restart recomputes once.
const cache = new Map<string, Pick<CaseSummary, 'text' | 'keyFacts'>>();

export async function summarizeCase(s: SummaryInput): Promise<Pick<CaseSummary, 'text' | 'keyFacts'>> {
  const fallback = factualSummary(s);
  if (process.env.NODE_ENV === 'test' || s.lines.length === 0) return fallback;
  const key = `${s.caseId}:${s.lines.length}:${s.status}:${s.lang}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const who = (id: string) => (id === s.buyer.id ? `${s.buyer.displayName} (buyer)` : id === s.seller.id ? `${s.seller.displayName} (seller)` : 'Support');
  const transcript = s.lines
    .slice(-40)
    .map((l) => `${who(l.from)} [${l.origLang}]: ${l.origText}${l.tr.en && l.origLang !== 'en' ? `  (English: ${l.tr.en})` : ''}`)
    .join('\n');
  const prompt = `You help a marketplace support agent settle a dispute between a buyer and a seller who speak different languages.
Write in language code "${s.lang}". Use only the evidence below. Never mention ids, codes or channels. No em dashes.
Return JSON only: {"text": "2 to 3 plain sentences: what the buyer is claiming, what the agreed deal says, and where the two differ or where meaning may have been lost in translation", "keyFacts": ["3 to 5 short factual bullets with prices, dates and agreed terms"]}

Reason given: ${REASON[s.reason]}
Agreed deal (frozen when help was requested): ${s.deal ? JSON.stringify({ item: s.deal.item.en ?? Object.values(s.deal.item)[0], price: money(s.deal), status: s.deal.status, delivery: s.deal.delivery?.method, terms: s.deal.conditions.en ?? Object.values(s.deal.conditions)[0], buyerAgreed: day(s.deal.agreedBy.buyer), sellerAgreed: day(s.deal.agreedBy.seller) }) : 'none'}
${s.resolution ? `Resolution so far: ${s.resolution}\n` : ''}Transcript:
${transcript}`;

  try {
    const raw = await geminiGenerate([{ text: prompt }], { maxOutputTokens: 400, timeoutMs: 6000, temperature: 0.2 });
    const json = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')) as { text?: unknown; keyFacts?: unknown };
    if (typeof json.text !== 'string' || !Array.isArray(json.keyFacts)) return fallback;
    const clean = (t: string) => t.replace(/\b(ch|grp|c|u|d|l)_[a-z0-9_]{6,}\b/gi, '').replace(/\s*—\s*/g, ', ').trim();
    const out = { text: clean(json.text), keyFacts: json.keyFacts.filter((f): f is string => typeof f === 'string').slice(0, 5).map(clean) };
    if (!out.text) return fallback;
    cache.set(key, out);
    return out;
  } catch {
    return fallback;
  }
}
