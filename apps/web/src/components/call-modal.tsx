"use client";

import { useEffect, useState } from "react";
import { acceptCall, hangUp, initCalls, setMuted, useCallState } from "@/lib/nexconn/call";
import { ensureConnected } from "@/lib/chat-connection";
import { useSession } from "@/lib/session";

/** A soft two-tone ring while a call is ringing. Browsers may keep it silent until the page has had a tap. */
function useRing(on: boolean) {
  useEffect(() => {
    if (!on || typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const ring = () => {
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      gain.connect(ctx.destination);
      for (const hz of [440, 480]) {
        const osc = ctx.createOscillator();
        osc.frequency.value = hz;
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 1.2);
      }
    };
    ring();
    const timer = setInterval(ring, 2600);
    return () => {
      clearInterval(timer);
      void ctx.close();
    };
  }, [on]);
}

function useElapsed(startedAt?: number) {
  const [now, setNow] = useState(0); // no Date.now() during render: it breaks prerendering (Cache Components)
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [startedAt]);
  const s = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const btn = "min-h-tap flex-1 rounded-lg px-4 font-medium disabled:opacity-50";

/** Global: rings for incoming calls on any page once signed in, and shows the active call. */
export function CallModal() {
  const session = useSession();
  const call = useCallState();
  const [pending, setPending] = useState(false);
  const elapsed = useElapsed(call.status === "connected" ? call.startedAt : undefined);
  useRing(call.status === "incoming");

  useEffect(() => {
    if (!session) return;
    ensureConnected(session)
      .then(() => initCalls())
      .catch(() => {}); // chat screens show their own connection state
  }, [session]);

  useEffect(() => setPending(false), [call.status]);

  if (call.status === "idle") return null;

  const act = (fn: () => Promise<void>) => async () => {
    setPending(true);
    await fn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-text"
      >
        {call.status === "ended" ? (
          <p id="call-title" role="status" className="text-center text-lg font-semibold">
            {call.reason}
          </p>
        ) : (
          <div className="flex flex-col gap-1 text-center" aria-live="polite">
            <p className="text-sm text-muted">
              {call.status === "incoming"
                ? "Incoming voice call"
                : call.status === "outgoing"
                  ? "Calling…"
                  : call.status === "connecting"
                    ? "Connecting…"
                    : "On a voice call"}
            </p>
            <h2 id="call-title" className="truncate text-xl font-semibold">
              {call.peerName}
            </h2>
            {call.status === "connected" && (
              <p className="font-mono text-2xl tabular-nums" aria-label={`Call time ${elapsed}`}>
                {elapsed}
              </p>
            )}
            <p className="text-xs text-muted">Voice is not translated. Use the chat for prices and deal terms.</p>
          </div>
        )}

        {call.status === "incoming" && (
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={act(() => hangUp(call.callId))} className={`${btn} border border-danger text-danger`}>
              Decline
            </button>
            <button type="button" autoFocus disabled={pending} onClick={act(() => acceptCall(call.callId))} className={`${btn} bg-brand text-brand-fg`}>
              Accept
            </button>
          </div>
        )}

        {(call.status === "outgoing" || call.status === "connecting") && (
          <button type="button" autoFocus disabled={pending} onClick={act(() => hangUp(call.callId))} className={`${btn} bg-danger text-surface`}>
            Cancel
          </button>
        )}

        {call.status === "connected" && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={call.muted}
              onClick={() => void setMuted(!call.muted)}
              className={`${btn} border ${call.muted ? "border-danger bg-danger-bg text-danger" : "border-border"}`}
            >
              {call.muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" autoFocus disabled={pending} onClick={act(() => hangUp(call.callId))} className={`${btn} bg-danger text-surface`}>
              Hang up
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
