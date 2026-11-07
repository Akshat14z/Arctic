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
  useEffect(() => {
    setLanguage((l) => l ?? preferredLanguage(navigator.languages));
  }, []);
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
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="page-title">Get started</h1>
        <p className="text-muted">Two quick choices. No email or password.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="label">Your name</span>
        <input
          autoFocus
          autoComplete="given-name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya"
          className="field"
        />
        <span className="hint">Shown to the people you chat with.</span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">The language you read</legend>
        <div className="grid border-t border-border sm:grid-cols-2 sm:gap-x-6">
          {LANGUAGES.map((l) => (
            <label
              key={l.code}
              className="flex min-h-tap cursor-pointer items-center gap-3 border-b border-border py-3 hover:bg-surface has-[:checked]:bg-surface"
            >
              <input
                type="radio"
                name="language"
                value={l.code}
                checked={chosen === l.code}
                onChange={() => setLanguage(l.code)}
                aria-label={l.code === "en" ? l.native : `${l.native} (${l.english})`}
                className="size-4 shrink-0 accent-text"
              />
              <span lang={l.code} className="text-lg">
                {l.native}
              </span>
              {l.code !== "en" && <span className="meta ml-auto pr-2">{l.english}</span>}
            </label>
          ))}
        </div>
        <span className="hint">Every message you get will be shown in this language.</span>
      </fieldset>

      {error && (
        <p role="alert" className="note note-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={!displayName || busy} aria-busy={busy} className="btn btn-primary self-start px-8">
        {busy ? "Signing you in…" : "Start"}
      </button>
    </form>
  );
}
