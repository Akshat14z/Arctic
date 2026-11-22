"use client";

import { useSyncExternalStore } from "react";
import { AuthResponseSchema, type AuthResponse } from "@convocart/contracts";

// The signed-in session survives refresh in localStorage (ARCHITECTURE §3). Storage can be blocked or
// corrupt, so every read is validated and every access is guarded.
const BASE_KEY = "handshake.session";
/**
 * Judge mode (/try/both) runs two people side by side in two frames named "hs-seat-<role>". Each frame keeps its
 * own session under its own key, so the two sign-ins never overwrite each other. Everywhere else: one key.
 */
export function seatName(): string | null {
  if (typeof window === "undefined") return null;
  return /^hs-seat-[a-z]+$/.test(window.name) ? window.name.slice(8) : null;
}
const key = () => (seatName() ? `${BASE_KEY}.${seatName()}` : BASE_KEY);
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: AuthResponse | null } = { raw: null, value: null };

function read(): AuthResponse | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key());
  } catch {}
  if (raw !== cache.raw) {
    let value: AuthResponse | null = null;
    try {
      const parsed = AuthResponseSchema.safeParse(JSON.parse(raw ?? "null"));
      value = parsed.success ? parsed.data : null;
      // Auto-purge stale mock sessions from earlier offline runs so real credentials are used
      if (value && (value.sessionToken.startsWith("mock_") || value.nexconn.token === "mock-nexconn-token")) {
        value = null;
        try {
          localStorage.removeItem(key());
        } catch {}
      }
    } catch {}
    cache = { raw, value }; // stable reference until storage changes, as useSyncExternalStore requires
  }
  return cache.value;
}

function write(value: AuthResponse | null) {
  const raw = value ? JSON.stringify(value) : null;
  try {
    if (raw) localStorage.setItem(key(), raw);
    else localStorage.removeItem(key());
  } catch {}
  // Update the in-memory snapshot before notifying React. This makes the signed-in nav available on
  // the same render as the client-side redirect, even when storage events are delayed or unavailable.
  cache = { raw, value };
  window.dispatchEvent(new Event("commongrounds:session"));
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l); // sign-in/out in another tab
  window.addEventListener("commongrounds:session", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
    window.removeEventListener("commongrounds:session", l);
  };
}

export const saveSession = (s: AuthResponse) => write(s);
export const clearSession = () => write(null);
/**
 * The Sign out button: forget the session, then a full page load to the home page. The reload also closes this
 * page's Nexconn connection, so the next person to sign in on this tab never inherits the previous user's chat.
 */
export function signOut() {
  write(null);
  window.location.assign("/");
}
export const getSession = read;

/** `undefined` while hydrating on the client, `null` when signed out. */
export function useSession(): AuthResponse | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
