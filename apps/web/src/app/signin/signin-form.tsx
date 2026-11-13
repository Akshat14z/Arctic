"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthResponseSchema } from "@convocart/contracts";
import { PasswordField } from "@/components/auth/password-field";
import { api, friendlyMessage } from "@/lib/api/client";
import { nextPath, useWithNext } from "@/lib/next-path";
import { saveSession, useSession } from "@/lib/session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email + password sign-in. A signed-in account goes straight on; a guest can sign in to a different account. */
export function SigninForm() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupHref = useWithNext("/signup");

  useEffect(() => {
    if (session && (session.email || session.user.isDemo || session.user.role === "agent") && !busy) router.replace(nextPath());
  }, [session, busy, router]);

  const errors = {
    email: !EMAIL.test(email.trim()) ? "Enter the email you signed up with." : null,
    password: !password ? "Enter your password." : null,
  };
  const show = (k: keyof typeof errors) => touched && errors[k];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errors.email || errors.password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/auth/signin", { method: "POST", body: { email: email.trim(), password }, schema: AuthResponseSchema });
      saveSession(res);
      router.replace(nextPath(res.user.role === "agent" ? "/agent" : "/home"));
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-2">
      <div className="flex flex-col gap-2">
        <h1 className="page-title">Welcome back</h1>
        <p className="text-muted">Sign in to pick up your chats where you left them.</p>
      </div>

      <form onSubmit={submit} noValidate className="tile gap-5">
        <label className="flex flex-col gap-2">
          <span className="label">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!show("email") || undefined}
            aria-describedby="signin-email-hint"
            className="field"
          />
          {show("email") && (
            <span id="signin-email-hint" className="hint text-danger">
              {show("email")}
            </span>
          )}
        </label>

        <div className="flex flex-col gap-2">
          <label htmlFor="signin-password" className="label">
            Password
          </label>
          <PasswordField id="signin-password" value={password} onChange={setPassword} autoComplete="current-password" invalid={!!show("password")} describedBy="signin-password-hint" />
          {show("password") && (
            <span id="signin-password-hint" className="hint text-danger">
              {show("password")}
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="note note-error">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <p>
          New to Handshake?{" "}
          <Link href={signupHref} className="link">
            Create an account
          </Link>
        </p>
        <p className="text-muted">
          Just looking?{" "}
          <Link href="/try" className="link">
            Try the demo
          </Link>
          . Support agent?{" "}
          <Link href="/agent/sign-in" className="link">
            Agent sign-in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
