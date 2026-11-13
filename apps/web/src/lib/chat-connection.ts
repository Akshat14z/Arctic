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
      saveSession({ ...session, user: me.user, nexconn: me.nexconn, ...(me.email ? { email: me.email } : {}) });
      return await connect(me.nexconn);
    } catch (e) {
      started = null; // let the next screen retry
      // Only a dead Handshake session signs you out. A Nexconn rejection (e.g. 31004) after a fresh token from
      // /api/me is Nexconn failing, and signing out would not fix it: the chat screen shows the error instead.
      if (e instanceof ApiError && e.status === 401) clearSession();
      throw e;
    }
  })();
  return started;
}

export function useConnectionState() {
  return useSyncExternalStore(onConnectionState, getConnectionState, () => "connecting" as const);
}
