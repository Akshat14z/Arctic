"use client";

// 1:1 audio calls (Nexconn Call SDK). Every call here was checked against node_modules/@nexconn/call/index.d.ts (v26.2.1).
// The package is imported lazily: it is browser-only and only needed once someone is signed in.
import { useSyncExternalStore } from "react";
import type { NCCallEngine, NCCallEndReason } from "@nexconn/call";

export type CallState =
  | { status: "idle" }
  | { status: "outgoing"; peerName: string; callId?: string }
  | { status: "incoming"; peerName: string; callId: string }
  | { status: "connecting"; peerName: string; callId: string }
  | { status: "connected"; peerName: string; callId: string; startedAt: number; muted: boolean }
  | { status: "ended"; reason: string };

const IDLE: CallState = { status: "idle" };
let state: CallState = IDLE;
const listeners = new Set<() => void>();
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function set(next: CallState) {
  state = next;
  clearTimeout(idleTimer);
  if (next.status === "ended") idleTimer = setTimeout(() => set(IDLE), 2500); // show why, then close
  listeners.forEach((l) => l());
}

const busy = () => state.status !== "idle" && state.status !== "ended";
const peerName = () => ("peerName" in state ? state.peerName : "");

export function useCallState(): CallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => IDLE,
  );
}

let installed = false;
/** Must run once, before NCEngine.initialize() (NCCallEngine.install docs). Chat keeps working if it fails. */
export async function installCalls(): Promise<void> {
  if (installed) return;
  try {
    const { NCCallEngine } = await import("@nexconn/call");
    NCCallEngine.install();
    installed = true;
  } catch (e) {
    console.warn("[call] install failed; calls disabled", e);
  }
}

function endText(reason: NCCallEndReason, R: typeof NCCallEndReason): string {
  switch (reason) {
    case R.DECLINED:
      return "Call declined";
    case R.NO_ANSWER:
      return "No answer";
    case R.MISSED:
      return "Missed call";
    case R.CANCELED:
      return "Call cancelled";
    case R.CONNECTION_ERROR:
    case R.JOIN_ERROR:
    case R.REMOTE_JOIN_ERROR:
    case R.ABNORMAL_END:
      return "Call dropped. Check your connection.";
    default:
      return "Call ended";
  }
}

function codeText(code: number): string {
  if (code === 80006) return "Calling isn't available right now."; // VoIP service not enabled on the app
  if (code === 80012) return "Reconnecting. Try again in a moment.";
  if (code === 80101) return "Allow microphone access to call.";
  if (code === 80002) return "You're already on a call.";
  return "Couldn't connect the call. Try again.";
}

let engine: Promise<NCCallEngine | null> | null = null;
/** Creates the call engine and listens for incoming calls. Call after the chat connection is up. */
export function initCalls(): Promise<NCCallEngine | null> {
  if (!installed) return Promise.resolve(null);
  engine ??= import("@nexconn/call").then(({ NCCallEngine, NCCallEndReason: R }) => {
    const e = NCCallEngine.initialize({});
    e.setCallEventHandler({
      onCallReceived({ session, extra }) {
        const callId = session.getCallId();
        if (busy()) return void e.endCall({ callId }); // one call at a time
        let name = session.getCallerUserId();
        try {
          name = (JSON.parse(extra ?? "{}") as { callerName?: string }).callerName || name;
        } catch {}
        set({ status: "incoming", peerName: name, callId });
      },
      onCallConnected({ session }) {
        set({ status: "connected", peerName: peerName(), callId: session.getCallId(), startedAt: Date.now(), muted: false });
      },
      onCallEnded({ reason }) {
        set({ status: "ended", reason: endText(reason, R) });
      },
    });
    return e;
  });
  return engine;
}

/** Asks for the microphone up front, so a denied prompt gets a clear message instead of a silent call. */
async function micAllowed(): Promise<boolean> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function startCall(peerId: string, name: string, myName: string): Promise<void> {
  if (busy()) return;
  set({ status: "outgoing", peerName: name });
  if (!(await micAllowed())) return set({ status: "ended", reason: "Allow microphone access to call." });
  try {
    const e = await initCalls();
    if (!e) return set({ status: "ended", reason: codeText(80006) });
    const { NCCallType, NCCallMediaType, NCCallCode } = await import("@nexconn/call");
    const res = await e.startCall({
      calleeIds: [peerId],
      callType: NCCallType.SINGLE,
      mediaType: NCCallMediaType.AUDIO,
      extra: JSON.stringify({ callerName: myName }),
    });
    if (res.code !== NCCallCode.SUCCESS) return set({ status: "ended", reason: codeText(res.code) });
    if (res.busyLineUserList?.length) {
      void e.endCall(res.callId ? { callId: res.callId } : undefined);
      return set({ status: "ended", reason: `${name} is on another call` });
    }
    if (state.status !== "outgoing") void e.endCall(res.callId ? { callId: res.callId } : undefined); // cancelled while dialing
    else if (res.callId) set({ ...state, callId: res.callId });
  } catch {
    set({ status: "ended", reason: codeText(0) });
  }
}

export async function acceptCall(callId: string): Promise<void> {
  const name = peerName();
  if (!(await micAllowed())) {
    void hangUp(callId);
    return set({ status: "ended", reason: "Allow microphone access to answer." });
  }
  set({ status: "connecting", peerName: name, callId });
  const e = await initCalls();
  const res = await e?.acceptCall({ callId }).catch(() => null);
  if (res?.code !== 0) set({ status: "ended", reason: codeText(res?.code ?? 0) });
}

/** Cancel, decline or hang up. Without an id it ends the active call. */
export async function hangUp(callId?: string): Promise<void> {
  const e = await initCalls();
  await e?.endCall(callId ? { callId } : undefined).catch(() => null);
  if (busy()) set({ status: "ended", reason: "Call ended" }); // onCallEnded usually beats us to it
}

export async function setMuted(muted: boolean): Promise<void> {
  const e = await initCalls();
  const res = await e?.enableMicrophone(!muted).catch(() => null);
  if (res?.code === 0 && state.status === "connected") set({ ...state, muted });
}
