"use client";

import type {
  NCCallEngine,
  NCCallEventHandler,
  NCCallReceivedEvent,
  NCCallConnectedEvent,
  NCCallEndedEvent,
} from "@nexconn/call";

export type CallState =
  | { status: "idle" }
  | { status: "calling"; calleeId: string; calleeName: string; callId?: string }
  | { status: "incoming"; callerId: string; callerName: string; callId: string }
  | { status: "connecting"; calleeId?: string; calleeName?: string; callId: string }
  | { status: "connected"; remoteUserId: string; remoteName: string; callId: string; startedAt: number; isMuted: boolean }
  | { status: "ended"; reasonText: string };

let engineInstance: NCCallEngine | null = null;
let currentCallState: CallState = { status: "idle" };
const stateListeners = new Set<(state: CallState) => void>();
let endedTimer: NodeJS.Timeout | null = null;

function notify(newState: CallState) {
  currentCallState = newState;
  stateListeners.forEach((listener) => {
    try {
      listener(newState);
    } catch (e) {
      console.error("[Call] State listener error:", e);
    }
  });
}

function notifyEnded(reasonText: string) {
  if (endedTimer) clearTimeout(endedTimer);
  notify({ status: "ended", reasonText });
  endedTimer = setTimeout(() => {
    notify({ status: "idle" });
  }, 2200);
}

/**
 * Initializes the NexConn Call engine and binds global event handlers.
 */
export async function initCallEngine(): Promise<NCCallEngine | null> {
  if (typeof window === "undefined") return null;

  if (!engineInstance) {
    try {
      const { NCCallEngine } = await import("@nexconn/call");
      NCCallEngine.install();
      engineInstance = NCCallEngine.initialize({});

      const handler: NCCallEventHandler = {
        onCallReceived: (event: NCCallReceivedEvent) => {
          console.log("[Call] Incoming call event received:", event);
          const callId = event.session?.getCallId?.() ?? (event as any).callId ?? "";
          const callerId =
            (event.session as any)?.getCallerUserId?.() ??
            (event.session as any)?.getCreatorUserId?.() ??
            (event as any).callerUserId ??
            "Caller";

          let callerName = callerId;
          try {
            if (event.extra) {
              const extraData = JSON.parse(event.extra);
              if (extraData?.callerName) callerName = extraData.callerName;
            }
          } catch {}

          // If already in a call, automatically decline new incoming call
          if (currentCallState.status === "connected" || currentCallState.status === "calling") {
            console.warn("[Call] User is busy in another call. Auto-declining:", callId);
            engineInstance?.endCall({ callId }).catch(() => {});
            return;
          }

          notify({
            status: "incoming",
            callerId,
            callerName,
            callId,
          });
        },

        onCallConnected: (event: NCCallConnectedEvent) => {
          console.log("[Call] Call connected event received:", event);
          const callId = event.session?.getCallId?.() ?? (event as any).callId ?? "";

          // Preserve friendly display name from previous state if available
          let displayName = "Participant";
          if (currentCallState.status === "calling" || currentCallState.status === "connecting") {
            displayName = currentCallState.calleeName || displayName;
          } else if (currentCallState.status === "incoming") {
            displayName = currentCallState.callerName || displayName;
          }

          const participants = event.session?.getRemoteParticipants?.() ?? [];
          const remoteId = (participants[0] as any)?.getUserId?.() ?? (event as any).remoteUserId ?? displayName;

          notify({
            status: "connected",
            remoteUserId: remoteId,
            remoteName: displayName,
            callId,
            startedAt: Date.now(),
            isMuted: false,
          });
        },

        onCallEnded: (event: NCCallEndedEvent) => {
          console.log("[Call] Call ended event received:", event);
          let reasonText = "Call ended";
          const reason = (event as any)?.reason;

          if (reason === 1004) {
            reasonText = "Call declined";
          } else if (reason === 1001 || reason === 1002) {
            reasonText = "No answer";
          } else if (reason === 1003) {
            reasonText = "Call canceled";
          } else if (reason === 1110 || reason === 1210) {
            reasonText = "Call disconnected";
          }

          notifyEnded(reasonText);
        },
      };

      engineInstance.setCallEventHandler(handler);
    } catch (err) {
      console.warn("[Call] Call engine initialization warning:", err);
    }
  }

  return engineInstance;
}

export function subscribeCallState(callback: (state: CallState) => void): () => void {
  stateListeners.add(callback);
  callback(currentCallState);
  return () => {
    stateListeners.delete(callback);
  };
}

export async function startAudioCall(targetUserId: string, targetName: string, myDisplayName?: string): Promise<string> {
  if (currentCallState.status !== "idle") {
    throw new Error("A call is already active or in progress.");
  }

  // Pre-flight check: ensure microphone access is granted by the browser before dialing
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach((track) => track.stop());
    } catch {
      throw new Error("Microphone permission was denied. Please allow microphone access in your browser to place calls.");
    }
  }

  const engine = await initCallEngine();
  if (!engine) throw new Error("Voice call engine could not be initialized.");

  notify({
    status: "calling",
    calleeId: targetUserId,
    calleeName: targetName,
  });

  try {
    const { NCCallType, NCCallMediaType, NCCallCode } = await import("@nexconn/call");
    const extraPayload = JSON.stringify({
      callerName: myDisplayName || "Buyer",
      targetName,
    });

    const res = await engine.startCall({
      calleeIds: [targetUserId],
      callType: NCCallType.SINGLE,
      mediaType: NCCallMediaType.AUDIO,
      extra: extraPayload,
    });

    if (res.code !== NCCallCode.SUCCESS) {
      notifyEnded(`Call failed (code ${res.code})`);
      throw new Error(`Failed to place call (code ${res.code})`);
    }

    if (res.busyLineUserList && res.busyLineUserList.length > 0) {
      notifyEnded("User is currently busy on another call");
      return "";
    }

    notify({
      status: "calling",
      calleeId: targetUserId,
      calleeName: targetName,
      callId: res.callId,
    });

    return res.callId || "";
  } catch (err) {
    notifyEnded("Call failed");
    throw err;
  }
}

export async function acceptIncomingCall(callId: string): Promise<void> {
  // Pre-flight check: ensure microphone access
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach((track) => track.stop());
    } catch {
      notifyEnded("Microphone permission required");
      throw new Error("Microphone access is required to answer this call.");
    }
  }

  const engine = await initCallEngine();
  if (!engine) throw new Error("Call engine not available");

  let preservedName = "Participant";
  if (currentCallState.status === "incoming") {
    preservedName = currentCallState.callerName;
  }

  notify({
    status: "connecting",
    callId,
    calleeName: preservedName,
  });

  const { NCCallCode } = await import("@nexconn/call");
  const res = await engine.acceptCall({ callId });
  if (res.code !== NCCallCode.SUCCESS) {
    notifyEnded(`Could not accept (code ${res.code})`);
    throw new Error(`Failed to accept call (code ${res.code})`);
  }
}

export async function hangUpCall(callId?: string): Promise<void> {
  const engine = await initCallEngine();
  if (engine) {
    try {
      await engine.endCall(callId ? { callId } : undefined);
    } catch (err) {
      console.warn("[Call] Error ending call:", err);
    }
  }
  notifyEnded("Call ended");
}

export async function toggleMicrophoneMute(muted: boolean): Promise<boolean> {
  const engine = await initCallEngine();
  if (!engine) return false;

  try {
    // enableMicrophone(true) unmutes; enableMicrophone(false) mutes
    await engine.enableMicrophone(!muted);
    if (currentCallState.status === "connected") {
      notify({
        ...currentCallState,
        isMuted: muted,
      });
    }
    return true;
  } catch (err) {
    console.warn("[Call] Failed to toggle microphone:", err);
    return false;
  }
}
