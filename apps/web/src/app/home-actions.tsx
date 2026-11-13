"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";

export function HomeActions() {
  const session = useSession();
  // Reserve the space while hydrating so the page doesn't jump.
  if (session === undefined) return <div className="min-h-tap" aria-hidden />;

  if (!session) {
    return (
      <Link
        href="/signup"
        className="l-btn l-btn-ghost"
      >
        Get started
      </Link>
    );
  }

  return (
    <Link href={session.user.role === "agent" ? "/agent" : "/home"} className="l-btn l-btn-ghost">
      Continue as {session.user.displayName}
    </Link>
  );
}
