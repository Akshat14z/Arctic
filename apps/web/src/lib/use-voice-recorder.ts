"use client";

import { useEffect, useRef, useState } from "react";

export type Recording = { blob: Blob; seconds: number };

const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]; // Safari records mp4

/**
 * Microphone recording for voice notes (MediaRecorder). `seconds` is null while idle.
 * Stops by itself at `maxSec` and hands the clip to `onDone`, exactly like pressing Send.
 */
export function useVoiceRecorder(maxSec: number, onDone: (r: Recording) => void) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const rec = useRef<{ r: MediaRecorder; chunks: Blob[]; startedAt: number } | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  async function finish(send: boolean) {
    const cur = rec.current;
    if (!cur) return;
    rec.current = null;
    setSeconds(null);
    if (cur.r.state !== "inactive") {
      await new Promise((ok) => {
        cur.r.addEventListener("stop", ok, { once: true });
        cur.r.stop();
      });
    }
    cur.r.stream.getTracks().forEach((t) => t.stop());
    if (send) done.current({ blob: new Blob(cur.chunks, { type: cur.r.mimeType || "audio/webm" }), seconds: Math.round((Date.now() - cur.startedAt) / 1000) });
  }

  useEffect(() => {
    if (seconds === null) return;
    const timer = setInterval(() => {
      const cur = rec.current;
      if (!cur) return;
      const s = Math.floor((Date.now() - cur.startedAt) / 1000);
      if (s >= maxSec) void finish(true);
      else setSeconds(s);
    }, 250);
    return () => clearInterval(timer);
  }, [seconds === null, maxSec]); // restart the ticker only when a recording starts, not on every tick

  useEffect(() => () => void finish(false), []); // leaving the chat drops an unfinished recording

  /** Resolves to an error message for the user, or null once recording has started. */
  async function start(): Promise<string | null> {
    if (rec.current) return null;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return "Voice notes aren't supported in this browser.";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return "Allow microphone access to record a voice note.";
    }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    r.start(250);
    rec.current = { r, chunks, startedAt: Date.now() };
    setSeconds(0);
    return null;
  }

  return { seconds, start, stop: () => finish(true), cancel: () => finish(false) };
}
