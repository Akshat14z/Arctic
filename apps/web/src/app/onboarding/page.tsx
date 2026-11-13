"use client";

import { useEffect } from "react";
import { safeLocalPath } from "@/lib/safe-path";

/** Old address for getting started: account creation now lives at /signup (with "Continue as a guest"). */
export default function OnboardingPage() {
  useEffect(() => {
    const safe = safeLocalPath(new URLSearchParams(window.location.search).get("next"));
    window.location.replace(safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup");
  }, []);
  return <p className="meta">Taking you to sign up…</p>;
}
