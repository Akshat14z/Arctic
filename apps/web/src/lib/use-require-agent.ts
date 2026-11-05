"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";

/** For the dispatch console: anyone who isn't a signed-in agent goes to agent sign-in, then back here. */
export function useRequireAgent() {
  const session = useSession();
  const router = useRouter();
  const isAgent = session?.user.role === "agent";
  useEffect(() => {
    if (session !== undefined && !isAgent) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/agent/sign-in?next=${encodeURIComponent(here)}`);
    }
  }, [session, isAgent, router]);
  return isAgent ? session : null;
}
