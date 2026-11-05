"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CallState,
  subscribeCallState,
  acceptIncomingCall,
  hangUpCall,
  toggleMicrophoneMute,
  initCallEngine,
} from "@/lib/nexconn/call";
import { useSession } from "@/lib/session";
import { ensureConnected } from "@/lib/chat-connection";

/**
 * Self-contained Web Audio synthesizer for call chimes without external assets.
 */
class CallSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private timer: NodeJS.Timeout | null = null;

  startIncomingRing() {
    this.stop();
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const playRing = () => {
        if (!this.ctx || this.ctx.state === "closed") return;
        const now = this.ctx.currentTime;

        // Dual-frequency pleasant phone ringtone (440Hz + 480Hz)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      };

      playRing();
      this.timer = setInterval(playRing, 2600);
    } catch (e) {
      console.warn("[Call] Audio synthesizer warning:", e);
    }
  }

  startOutgoingRingback() {
    this.stop();
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === "closed") return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.8);
      };

      playBeep();
      this.timer = setInterval(playBeep, 3000);
    } catch (e) {
      console.warn("[Call] Ringback sound warning:", e);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

const sounds = new CallSoundSynthesizer();

export function CallModal() {
  const [callState, setCallState] = useState<CallState>({ status: "idle" });
  const [duration, setDuration] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);
  const session = useSession();
  const soundRef = useRef(sounds);

  // Global call engine initialization as soon as session exists
  useEffect(() => {
    if (session) {
      ensureConnected(session)
        .then(() => initCallEngine())
        .catch((e) => console.warn("[Call] Global connection warning:", e));
    }
  }, [session]);

  // Subscribe to call state changes
  useEffect(() => {
    return subscribeCallState(setCallState);
  }, []);

  // Manage sound effects for incoming / calling states
  useEffect(() => {
    if (callState.status === "incoming") {
      soundRef.current.startIncomingRing();
    } else if (callState.status === "calling") {
      soundRef.current.startOutgoingRingback();
    } else {
      soundRef.current.stop();
    }

    return () => {
      soundRef.current.stop();
    };
  }, [callState.status]);

  // Track active call duration
  useEffect(() => {
    if (callState.status !== "connected") {
      setDuration(0);
      return;
    }

    setActionInProgress(false);
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - callState.startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.status, (callState as any).startedAt]);

  if (callState.status === "idle") return null;

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center shadow-2xl">
        {/* INCOMING CALL */}
        {callState.status === "incoming" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 text-4xl animate-bounce">
              📞
            </div>
            <div>
              <h3 className="text-xl font-bold">Incoming Audio Call</h3>
              <p className="mt-1 text-base font-medium text-brand">{callState.callerName}</p>
              <p className="text-xs text-muted">Tap Accept to start 1v1 voice call</p>
            </div>
            <div className="mt-4 flex w-full justify-center gap-4">
              <button
                type="button"
                disabled={actionInProgress}
                onClick={async () => {
                  setActionInProgress(true);
                  await hangUpCall(callState.callId);
                  setActionInProgress(false);
                }}
                className="flex-1 rounded-2xl bg-danger py-3 font-semibold text-white hover:bg-danger/90 active:scale-95 transition disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={async () => {
                  setActionInProgress(true);
                  try {
                    await acceptIncomingCall(callState.callId);
                  } catch (e: any) {
                    alert(e?.message || "Could not connect call.");
                    setActionInProgress(false);
                  }
                }}
                className="flex-1 rounded-2xl bg-brand py-3 font-semibold text-brand-fg hover:bg-brand/90 active:scale-95 transition disabled:opacity-50"
              >
                {actionInProgress ? "Connecting…" : "Accept"}
              </button>
            </div>
          </div>
        )}

        {/* CALLING OUT */}
        {callState.status === "calling" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 text-4xl animate-pulse">
              📞
            </div>
            <div>
              <h3 className="text-xl font-bold">Calling…</h3>
              <p className="mt-1 text-base font-medium text-brand">{callState.calleeName}</p>
              <p className="text-xs text-muted">Ringing participant…</p>
            </div>
            <div className="mt-4 w-full">
              <button
                type="button"
                disabled={actionInProgress}
                onClick={async () => {
                  setActionInProgress(true);
                  await hangUpCall(callState.callId);
                  setActionInProgress(false);
                }}
                className="w-full rounded-2xl bg-danger py-3 font-semibold text-white hover:bg-danger/90 active:scale-95 transition disabled:opacity-50"
              >
                Cancel Call
              </button>
            </div>
          </div>
        )}

        {/* CONNECTING TRANSITION */}
        {callState.status === "connecting" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 text-4xl animate-spin">
              ⚙️
            </div>
            <div>
              <h3 className="text-xl font-bold">Connecting Audio…</h3>
              <p className="mt-1 text-sm text-muted">{callState.calleeName || "Establishing connection"}</p>
            </div>
          </div>
        )}

        {/* CONNECTED CALL */}
        {callState.status === "connected" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/30 text-4xl">
              🟢
            </div>
            <div>
              <h3 className="text-xl font-bold">Call Connected</h3>
              <p className="text-sm font-medium text-muted">{callState.remoteName}</p>
              <p className="mt-2 text-3xl font-mono font-semibold text-brand">{timeFormatted}</p>
            </div>

            {/* Mute and End Call controls */}
            <div className="mt-2 flex w-full items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await toggleMicrophoneMute(!callState.isMuted);
                }}
                className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
                  callState.isMuted
                    ? "border-danger bg-danger/20 text-danger"
                    : "border-border bg-surface hover:bg-surface-elevated text-fg"
                }`}
              >
                {callState.isMuted ? "🔇 Unmute" : "🎙️ Mute"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await hangUpCall(callState.callId);
                }}
                className="flex-1 rounded-2xl bg-danger py-3 text-sm font-semibold text-white hover:bg-danger/90 active:scale-95 transition"
              >
                Hang Up
              </button>
            </div>
          </div>
        )}

        {/* CALL ENDED FEEDBACK */}
        {callState.status === "ended" && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated text-3xl">
              📵
            </div>
            <div>
              <h3 className="text-lg font-bold">{callState.reasonText}</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
