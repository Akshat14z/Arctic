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
  try {
    if (value) localStorage.setItem(key(), JSON.stringify(value));
    else localStorage.removeItem(key());
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l); // sign-in/out in another tab
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

export const saveSession = (s: AuthResponse) => write(s);
export const clearSession = () => write(null);
export const getSession = read;

/** `undefined` while hydrating on the client, `null` when signed out. */
export function useSession(): AuthResponse | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
