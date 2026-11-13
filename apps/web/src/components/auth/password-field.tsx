"use client";

import { useState } from "react";

/** A password input with a visible Show / Hide toggle (one less reason to retype a long password). */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "new-password" | "current-password";
  invalid?: boolean;
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        maxLength={200}
        className="field pr-20"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        className="btn btn-quiet absolute inset-y-0 right-1 my-auto h-9 min-h-0 px-3 text-sm"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
