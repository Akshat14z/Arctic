"use client";

import { startCall, useCallState } from "@/lib/nexconn/call";

/** Voice call to the other side of a 1:1 chat. The call itself is shown by the global CallModal. */
export function CallButton({ peerId, peerName, myName }: { peerId: string; peerName: string; myName: string }) {
  const call = useCallState();
  const busy = call.status !== "idle" && call.status !== "ended";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void startCall(peerId, peerName, myName)}
      aria-label={`Voice call ${peerName}`}
      title={`Voice call ${peerName}`}
      className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-lg border border-border disabled:opacity-50"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
      </svg>
    </button>
  );
}
