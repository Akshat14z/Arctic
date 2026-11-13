"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthResponseSchema, type LangCode } from "@convocart/contracts";
import { LanguagePicker } from "@/components/auth/language-picker";
import { PasswordField } from "@/components/auth/password-field";
import { api, friendlyMessage } from "@/lib/api/client";
import { preferredLanguage } from "@/lib/languages";
import { nextPath, useWithNext } from "@/lib/next-path";
import { saveSession, useSession } from "@/lib/session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an account (name, email, password, language), or keep going as a guest.
 * A signed-in guest sees "Save your account": the same account gains an email, so chats and listings stay.
 */
export function SignupForm() {
  const router = useRouter();
  const session = useSession();
  const isGuest = !!session && session.user.role === "user" && !session.user.isDemo && !session.email;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<LangCode>("en");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<"account" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signinHref = useWithNext("/signin");

  // Already have an account (or a demo / agent session): nothing to do here.
  useEffect(() => {
    if (session && !isGuest && !busy) router.replace(nextPath());
  }, [session, isGuest, busy, router]);

  // Defaults after mount, so server and client markup match: the browser's language, or the guest's own details.
  useEffect(() => {
    if (isGuest && session) {
      setName((n) => n || session.user.displayName);
      setLanguage(session.user.language);
    } else {
      setLanguage(preferredLanguage(navigator.languages));
    }
  }, [isGuest, session]);

  const displayName = name.trim();
  const errors = {
    name: !displayName ? "Enter your name." : null,
    email: !EMAIL.test(email.trim()) ? "Enter a valid email address." : null,
    password: password.length < 8 ? "Use at least 8 characters." : null,
  };

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errors.name || errors.email || errors.password || busy) return;
    setBusy("account");
    setError(null);
    try {
      const res = await api("/api/auth/signup", {
        method: "POST",
        body: { displayName, language, email: email.trim(), password },
        token: isGuest ? session?.sessionToken : undefined,
        schema: AuthResponseSchema,
      });
      saveSession(res);
      router.replace(nextPath());
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(null);
    }
  }

  async function continueAsGuest() {
    setTouched(true);
    if (errors.name || busy) return;
    setBusy("guest");
    setError(null);
    try {
      const res = await api("/api/auth/guest", { method: "POST", body: { displayName, language }, schema: AuthResponseSchema });
      saveSession(res);
      router.replace(nextPath());
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(null);
    }
  }

  const show = (k: keyof typeof errors) => touched && errors[k];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-2">
      <div className="flex flex-col gap-2">
        <h1 className="page-title">{isGuest ? "Save your account" : "Create your account"}</h1>
        <p className="text-muted">
          {isGuest
            ? "Add an email and password to keep your chats and listings, and to sign in on any device."
            : "Chat with anyone, each of you in your own language."}
        </p>
      </div>

      <form onSubmit={createAccount} noValidate className="tile gap-5">
        <label className="flex flex-col gap-2">
          <span className="label">Your name</span>
          <input
            autoFocus={!isGuest}
            autoComplete="name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!show("name") || undefined}
            aria-describedby="name-hint"
            className="field"
          />
          <span id="name-hint" className={show("name") ? "hint text-danger" : "hint"}>
            {show("name") || "Shown to the people you chat with."}
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="label">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!show("email") || undefined}
            aria-describedby="email-hint"
            className="field"
          />
          {show("email") && (
            <span id="email-hint" className="hint text-danger">
              {show("email")}
            </span>
          )}
        </label>

        <div className="flex flex-col gap-2">
          <label htmlFor="signup-password" className="label">
            Password
          </label>
          <PasswordField id="signup-password" value={password} onChange={setPassword} autoComplete="new-password" invalid={!!show("password")} describedBy="password-hint" />
          <span id="password-hint" className={show("password") ? "hint text-danger" : "hint"}>
            {show("password") || "At least 8 characters."}
          </span>
        </div>

        <LanguagePicker value={language} onChange={setLanguage} />

        {error && (
          <p role="alert" className="note note-error">
            {error}
          </p>
        )}

        <button type="submit" disabled={!!busy} aria-busy={busy === "account"} className="btn btn-primary w-full">
          {busy === "account" ? "Creating your account…" : isGuest ? "Save my account" : "Create account"}
        </button>

        {!isGuest && (
          <>
            <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <button type="button" onClick={continueAsGuest} disabled={!!busy} aria-busy={busy === "guest"} className="btn btn-secondary w-full">
              {busy === "guest" ? "Starting…" : "Continue as a guest"}
            </button>
            <p className="hint -mt-2 text-center">A guest account stays on this device. You can add an email later.</p>
          </>
        )}
      </form>

      <p className="text-center text-sm">
        {isGuest ? (
          <Link href="/home" className="link">
            Not now
          </Link>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={signinHref} className="link">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
