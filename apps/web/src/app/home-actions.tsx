"use client";

import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { clearSession, useSession } from "@/lib/session";

export function HomeActions() {
  const session = useSession();
  // Reserve the space while hydrating so the page doesn't jump.
  if (session === undefined) return <div className="min-h-tap" aria-hidden />;

  if (!session) {
    return (
      <Link
        href="/onboarding"
        className="inline-flex min-h-tap items-center justify-center self-start rounded-lg bg-brand px-5 font-medium text-brand-fg"
      >
        Get started
      </Link>
    );
  }

  const { user } = session;
  const lang = LANGUAGES.find((l) => l.code === user.language);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p>
        Signed in as <strong>{user.displayName}</strong> · reading in <span lang={user.language}>{lang?.native}</span>
      </p>
      <button type="button" onClick={clearSession} className="min-h-tap text-sm text-muted underline">
        Sign out
      </button>
    </div>
  );
}
