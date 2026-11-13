"use client";

import { useEffect } from "react";

/** Old address for getting started: account creation now lives at /signup (with "Continue as a guest"). */
export default function OnboardingPage() {
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = next?.startsWith("/") && !next.startsWith("//") ? next : null;
    window.location.replace(safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup");
  }, []);
  return <p className="meta">Taking you to sign up…</p>;
}
