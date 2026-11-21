import type { CaseReason } from "@convocart/contracts";

export const REASONS: { value: CaseReason; label: string }[] = [
  { value: "item_not_as_described", label: "The item isn't as described" },
  { value: "misunderstanding", label: "We misunderstood each other" },
  { value: "payment_issue", label: "There's a problem with payment" },
  { value: "scam_suspected", label: "I think this is a scam" },
  { value: "other", label: "Something else" },
];

export const reasonLabel = (r: CaseReason) => REASONS.find((x) => x.value === r)?.label ?? r;

/** "3 min", "1 h 5 min", "2 d 3 h": whole units, never negative. Past a day, minutes are noise. */
export function minutesText(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  const h = Math.floor(m / 60);
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
