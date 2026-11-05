import type { CaseReason } from "@convocart/contracts";

export const REASONS: { value: CaseReason; label: string }[] = [
  { value: "item_not_as_described", label: "The item isn't as described" },
  { value: "misunderstanding", label: "We misunderstood each other" },
  { value: "payment_issue", label: "There's a problem with payment" },
  { value: "scam_suspected", label: "I think this is a scam" },
  { value: "other", label: "Something else" },
];

export const reasonLabel = (r: CaseReason) => REASONS.find((x) => x.value === r)?.label ?? r;

/** "3 min", "1 h 5 min" — whole minutes, never negative. */
export function minutesText(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
