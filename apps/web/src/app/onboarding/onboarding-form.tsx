"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthResponseSchema, type LangCode } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { LANGUAGES, preferredLanguage } from "@/lib/languages";
import { saveSession, useSession } from "@/lib/session";

/** Where to go after sign-in. Only same-site paths, so `?next=` can't be used as an open redirect. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function OnboardingForm() {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<LangCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace(nextPath());
  }, [session, router]);

  // Default to the browser's preferred language, after mount so server and client markup match.
  useEffect(() => setLanguage((l) => l ?? preferredLanguage(navigator.languages)), []);
  const chosen = language ?? "en";
  const displayName = name.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/auth/guest", {
        method: "POST",
        body: { displayName, language: chosen },
        schema: AuthResponseSchema,
      });
      saveSession(res); // the effect above redirects
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Get started</h1>
        <p className="text-muted">Two quick choices. No email or password.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Your name</span>
        <input
          autoFocus
          autoComplete="given-name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya"
          className="min-h-tap rounded-lg border border-border bg-surface px-3 text-base"
        />
        <span className="text-sm text-muted">Shown to the people you chat with.</span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">The language you read</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGES.map((l) => (
            <label
              key={l.code}
              className="flex min-h-tap cursor-pointer flex-col justify-center rounded-lg border border-border bg-surface px-3 py-2 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand"
            >
              <input
                type="radio"
                name="language"
                value={l.code}
                checked={chosen === l.code}
                onChange={() => setLanguage(l.code)}
                aria-label={l.code === "en" ? l.native : `${l.native} (${l.english})`}
                className="sr-only"
              />
              <span lang={l.code} className="font-medium">
                {l.native}
              </span>
              {l.code !== "en" && <span className="text-xs text-muted">{l.english}</span>}
            </label>
          ))}
        </div>
        <span className="text-sm text-muted">Every message you get will be shown in this language.</span>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!displayName || busy}
        className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
      >
        {busy ? "Signing you in…" : "Start"}
      </button>
    </form>
  );
}
