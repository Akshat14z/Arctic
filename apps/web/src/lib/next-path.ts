import { useEffect, useState } from "react";
import { safeLocalPath } from "./safe-path";

/** Where to go after signing in. Only same-site paths, so `?next=` can't be used as an open redirect. */
export function nextPath(fallback = "/home"): string {
  if (typeof window === "undefined") return fallback;
  return safeLocalPath(new URLSearchParams(window.location.search).get("next")) ?? fallback;
}

/** `?next=` carried from one auth page to the other, so switching between them keeps the destination. */
export function withNext(path: string): string {
  if (typeof window === "undefined") return path;
  const next = safeLocalPath(new URLSearchParams(window.location.search).get("next"));
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/** withNext() as a link href that matches the server HTML first and picks up `?next=` after hydration. */
export function useWithNext(path: string): string {
  const [href, setHref] = useState(path);
  useEffect(() => setHref(withNext(path)), [path]);
  return href;
}
