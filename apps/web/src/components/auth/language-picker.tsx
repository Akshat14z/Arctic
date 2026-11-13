"use client";

import type { LangCode } from "@convocart/contracts";
import { LANGUAGES } from "@/lib/languages";

/** The language someone reads, as a grid of radio cards: native name large, English name under it. */
export function LanguagePicker({ value, onChange }: { value: LangCode; onChange: (l: LangCode) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label mb-2">The language you read</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LANGUAGES.map((l) => (
          <label
            key={l.code}
            className="flex min-h-14 cursor-pointer flex-col justify-center rounded-[var(--radius-field)] border border-border bg-surface px-3 py-2 transition-colors hover:border-[var(--color-rule-2)] has-[:checked]:border-accent has-[:checked]:bg-[color-mix(in_oklab,var(--color-accent)_8%,var(--color-paper-2))] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-focus)]"
          >
            <input
              type="radio"
              name="language"
              value={l.code}
              checked={value === l.code}
              onChange={() => onChange(l.code)}
              className="sr-only"
            />
            <span lang={l.code} className="text-base leading-tight font-medium">
              {l.native}
            </span>
            {l.code !== "en" && <span className="meta leading-tight">{l.english}</span>}
          </label>
        ))}
      </div>
      <span className="hint">Every message you get is shown in this language. You can see the original any time.</span>
    </fieldset>
  );
}
