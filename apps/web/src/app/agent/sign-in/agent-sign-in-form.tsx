"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthResponseSchema, type LangCode } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { LANGUAGES } from "@/lib/languages";
import { saveSession, useSession } from "@/lib/session";

function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/agent") && !next.startsWith("//") ? next : "/agent";
}

export function AgentSignInForm() {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<LangCode>("en");
  const [helps, setHelps] = useState<LangCode[]>(["en"]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user.role === "agent") router.replace(nextPath());
  }, [session, router]);

  const ready = name.trim() && helps.length > 0 && code;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/auth/agent", {
        method: "POST",
        body: { displayName: name.trim(), language, agentLanguages: helps, code },
        schema: AuthResponseSchema,
      });
      saveSession(res); // the effect above redirects
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="page-title">Handshake support</h1>
        <p className="text-muted">Sign in to the dispatch console.</p>
        {session && session.user.role !== "agent" && (
          <p className="note">You&apos;re signed in as {session.user.displayName}. Signing in here switches you to a support account.</p>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className="label">Your name</span>
        <input autoFocus autoComplete="name" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} className="field" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="label">The language you read</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value as LangCode)} className="field">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code === "en" ? l.native : `${l.native} (${l.english})`}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">Languages you can help in</legend>
        <div className="grid grid-cols-2 gap-x-6 border-t border-border sm:grid-cols-4">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="flex min-h-tap cursor-pointer items-center gap-3 border-b border-border py-2 hover:bg-surface has-[:checked]:bg-surface">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-text"
                checked={helps.includes(l.code)}
                onChange={(e) => setHelps((h) => (e.target.checked ? [...h, l.code] : h.filter((c) => c !== l.code)))}
                aria-label={l.code === "en" ? l.native : `${l.native} (${l.english})`}
              />
              <span lang={l.code}>{l.native}</span>
            </label>
          ))}
        </div>
        <span className="hint">Cases in these languages are shown to you first. You can still help in any language.</span>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="label">Access code</span>
        <input type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="field" />
      </label>

      {error && (
        <p role="alert" className="note note-error">
          {error}
        </p>
      )}

      <button type="submit" disabled={!ready || busy} aria-busy={busy} className="btn btn-primary self-start px-8">
        {busy ? "Signing in…" : "Open the console"}
      </button>
    </form>
  );
}
