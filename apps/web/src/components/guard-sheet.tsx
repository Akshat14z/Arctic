"use client";

import { useEffect, useRef } from "react";
import type { GuardIssue, LangCode } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";
import { indianAmount } from "@/lib/guard";

const TITLES: Partial<Record<GuardIssue["kind"], string>> = {
  scam_signal: "This could put you at risk",
  currency: "Make the amount clear",
  number_format: "Make the number clear",
  date: "Make the date clear",
  unit: "Make the quantity clear",
  ambiguity: "This could be read two ways",
  tone: "This may sound harsh",
};

type Props = {
  /** A voice note can't be edited: no "Use …" fixes, and "Edit" becomes "Don't send". */
  voice?: boolean;
  text: string;
  issues: GuardIssue[];
  /** False when only non-blocking issues (tone, D-024) made us pause: then the choice is softer vs. as is. */
  blocking: boolean;
  lang: LangCode;
  onEdit: () => void;
  onUseSuggestion: (span: string, suggestion: string) => void;
  onSendAnyway: () => void;
  onSendSofter?: (text: string) => void;
};

/** The message with each flagged harsh phrase swapped for the server's softer wording (DHRUMIL-T16). */
export function softerText(text: string, issues: GuardIssue[]): string | null {
  const tone = issues.filter((i) => i.kind === "tone" && i.suggestion);
  return tone.length ? tone.reduce((t, i) => t.replace(i.span, i.suggestion!), text) : null;
}

/** Meaning Guard (DHRUMIL-T09): shown before a blocking message is sent, or a harsh-sounding one (T16). */
export function GuardSheet({ voice, text, issues, blocking, lang, onEdit, onUseSuggestion, onSendAnyway, onSendSofter }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scam = issues.some((i) => i.kind === "scam_signal");
  const first = issues.find((i) => i.kind === "scam_signal") ?? issues[0];
  const softer = voice ? null : softerText(text, issues);
  const toneOnly = !blocking && !!softer && !!onSendSofter;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault(); // Esc = "Edit message", never a silent send
        onEdit();
      }}
      aria-labelledby="guard-title"
      className="m-auto w-[min(100%-2rem,28rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 id="guard-title" className={`text-lg font-semibold ${scam ? "text-danger" : ""}`}>
            {(first && TITLES[first.kind]) ?? "Check before sending"}
          </h2>
          <p className="text-sm text-muted">
            {toneOnly
              ? "The other person reads a translation, and blunt words can land even harder. Nothing here is wrong to send."
              : "The other person reads a translation. Make sure it means what you mean."}
          </p>
        </div>

        <blockquote lang={lang} className="rounded-lg border-l-4 border-border bg-bg px-3 py-2">
          {text}
        </blockquote>

        <ul className="flex flex-col gap-3">
          {issues.map((issue, i) => {
            const amount = issue.kind === "currency" ? indianAmount(issue.span) : null;
            // "Use …" replaces the flagged words, so only offer it where the suggestion is replacement text (amounts).
            // "2 lakh" → "₹2,00,000": exact, and free of the word the rule flags (the server's "₹2 lakh" is flagged again).
            const replaceable = issue.kind === "currency" || issue.kind === "number_format";
            const suggestion = voice ? undefined : amount !== null ? formatPrice({ amount, currency: "INR" }, lang) : replaceable ? issue.suggestion : undefined;
            const danger = issue.kind === "scam_signal";
            return (
              <li key={`${issue.kind}-${i}`} className={`rounded-lg p-3 ${danger ? "bg-danger-bg text-danger" : "bg-guard-bg text-guard"}`}>
                <p className="text-sm">
                  <mark className="rounded bg-transparent font-semibold text-inherit underline decoration-2">{issue.span}</mark>
                  {amount !== null && (
                    <>
                      {" "}= <strong>{formatPrice({ amount, currency: "INR" }, lang)}</strong>
                    </>
                  )}
                </p>
                <p lang={lang} className="mt-1 text-sm text-text">
                  {issue.explanation[lang] ?? issue.explanation.en}
                </p>
                {issue.kind === "tone" && softer && (
                  <p lang={lang} className="mt-2 text-sm text-text">
                    Softer: <q>{softer}</q>
                  </p>
                )}
                {issue.kind === "tone" && softer && !toneOnly && issue.suggestion && (
                  <button
                    type="button"
                    onClick={() => onUseSuggestion(issue.span, issue.suggestion!)}
                    className="mt-2 min-h-tap rounded-lg border border-current px-3 text-sm font-medium"
                  >
                    Use softer wording
                  </button>
                )}
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => onUseSuggestion(issue.span, suggestion)}
                    className="mt-2 min-h-tap rounded-lg border border-current px-3 text-sm font-medium"
                  >
                    Use “{suggestion}”
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {toneOnly ? (
          <div className="flex flex-col gap-2">
            <button type="button" autoFocus onClick={() => onSendSofter!(softer!)} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg">
              Send softer version
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onEdit} className="min-h-tap flex-1 rounded-lg border border-border px-4 font-medium">
                Edit message
              </button>
              <button type="button" onClick={onSendAnyway} className="min-h-tap flex-1 rounded-lg border border-border px-4 font-medium">
                Send as is
              </button>
            </div>
          </div>
        ) : (
        <div className="flex gap-2">
          <button type="button" autoFocus onClick={onEdit} className="min-h-tap flex-1 rounded-lg bg-brand px-4 font-medium text-brand-fg">
            {voice ? "Don't send" : "Edit message"}
          </button>
          <button
            type="button"
            onClick={onSendAnyway}
            className={`min-h-tap flex-1 rounded-lg border px-4 font-medium ${scam ? "border-danger text-danger" : "border-border"}`}
          >
            Send anyway
          </button>
        </div>
        )}
      </div>
    </dialog>
  );
}
