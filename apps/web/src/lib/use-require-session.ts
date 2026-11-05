"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";

/** For pages that need a signed-in user: sends guests to onboarding and back here afterwards. */
export function useRequireSession() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session === null) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/onboarding?next=${encodeURIComponent(here)}`);
    }
  }, [session, router]);
  return session;
}
