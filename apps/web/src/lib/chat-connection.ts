"use client";

import { useSyncExternalStore } from "react";
import { MeResponseSchema, type AuthResponse } from "@convocart/contracts";
import { api, ApiError } from "./api/client";
import { connect, getConnectionState, onConnectionState } from "./nexconn";
import { clearSession, saveSession } from "./session";

// One Nexconn connection per page load, shared by every chat screen.
let started: Promise<string> | null = null;

/** Refreshes the Nexconn token via GET /api/me (C3), then connects. Signs out if the session is gone. */
export function ensureConnected(session: AuthResponse): Promise<string> {
  if (session.sessionToken.startsWith("mock_") || session.nexconn.token === "mock-nexconn-token") {
    clearSession();
    throw new ApiError("UNAUTHORIZED", false, 401);
  }
  started ??= (async () => {
    try {
      const me = await api("/api/me", { token: session.sessionToken, schema: MeResponseSchema });
      saveSession({ ...session, user: me.user, nexconn: me.nexconn });
      return await connect(me.nexconn);
    } catch (e) {
      started = null; // let the next screen retry
      if (e instanceof ApiError && e.status === 401) clearSession();
      if (e instanceof Error && e.message.includes("31004")) clearSession();
      throw e;
    }
  })();
  return started;
}

export function useConnectionState() {
  return useSyncExternalStore(onConnectionState, getConnectionState, () => "connecting" as const);
}
