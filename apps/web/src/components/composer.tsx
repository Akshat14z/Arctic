"use client";

import { useState } from "react";
import {
  PreparedMessageSchema,
  TranscribeAudioResponseSchema,
  type LangCode,
  type PreparedMessage,
} from "@convocart/contracts";
import { api } from "@/lib/api/client";
import { sendText, type ChannelRef, type ChatMessage } from "@/lib/nexconn";
import { useVoiceRecorder, type Recording } from "@/lib/use-voice-recorder";
import { GuardSheet, softerText } from "./guard-sheet";

// `extra` must stay under ~8 KB (DHRUMIL-006); Indic text is ~3 bytes/char and `tr` repeats it per language.
const MAX = 1000;
const PREPARE_BUDGET_MS = 8000; // server tries up to 7 s per model (AKSHAT translation fallback chain)
const MAX_VOICE_SEC = 60;
const VOICE_BUDGET_MS = 30_000; // upload + speech-to-text
// Sent as the text when speech-to-text heard nothing, so the reader still sees what arrived.
const VOICE_LABEL: Record<LangCode, string> = {
  en: "Voice note",
  hi: "वॉयस संदेश",
  ta: "குரல் செய்தி",
  te: "వాయిస్ సందేశం",
  kn: "ಧ್ವನಿ ಸಂದೇಶ",
  bn: "ভয়েস বার্তা",
  mr: "व्हॉइस मेसेज",
  ja: "音声メッセージ",
};
const SEND_FAILED = "Couldn't send. Check your connection and tap Send again.";

type Props = {
  channel: ChannelRef;
  channelId: string;
  lang: LangCode;
  token: string;
  disabled: boolean;
  onSent: (m: ChatMessage) => void;
};

/** Translation + Meaning Guard via /prepare; if it fails or is slow, send the original anyway (ARCHITECTURE §4.2). */
async function prepare(channelId: string, text: string, lang: LangCode, token: string): Promise<PreparedMessage> {
  const fallback: PreparedMessage = {
    messageText: text,
    extra: { v: 1, kind: "text", orig: { lang, text }, tr: {} },
    guard: { issues: [], blocking: false },
  };
  try {
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), PREPARE_BUDGET_MS));
    const call = api("/api/messages/prepare", {
      method: "POST",
      body: { channelId, text, senderLang: lang },
      token,
      schema: PreparedMessageSchema,
    });
    return (await Promise.race([call, timeout])) ?? fallback;
  } catch {
    return fallback;
  }
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((ok, fail) => {
    const reader = new FileReader();
    reader.onload = () => ok(String(reader.result));
    reader.onerror = fail;
    reader.readAsDataURL(blob);
  });

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Composer({ channel, channelId, lang, token, disabled, onSent }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [held, setHeld] = useState<PreparedMessage | null>(null); // waiting on the Meaning Guard sheet
  const text = draft.trim();

  async function deliver(prepared: PreparedMessage, acknowledged: boolean) {
    const extra = acknowledged ? { ...prepared.extra, guard: { issues: prepared.guard.issues, acknowledged: true } } : prepared.extra;
    try {
      onSent(await sendText(channel, prepared.messageText, JSON.stringify(extra)));
      if (extra.kind !== "voice_note") setDraft("");
    } catch {
      setFailed(SEND_FAILED); // keep the draft so nothing is lost
    }
  }

  /** Voice note (DHRUMIL-T19): upload + speech-to-text, then the transcript goes through /prepare like typed text. */
  async function sendVoice({ blob, seconds }: Recording) {
    if (seconds < 1 || blob.size < 1000) return setFailed("That was too short. Hold the recording a little longer.");
    setSending(true);
    try {
      const timeout = new Promise<never>((_, fail) => setTimeout(() => fail(new Error("timeout")), VOICE_BUDGET_MS));
      const heard = await Promise.race([
        api("/api/messages/transcribe", {
          method: "POST",
          body: { audioBase64: await toDataUrl(blob), mimeType: blob.type, senderLang: lang },
          token,
          schema: TranscribeAudioResponseSchema,
        }),
        timeout,
      ]);
      if (!heard.audioUrl) throw new Error("no audio url"); // never put the audio itself in `extra` (8 KB limit)
      const said = heard.transcription.trim();
      // Nothing heard: send the label already in every language instead of asking the LLM to translate it.
      const p: PreparedMessage = said
        ? await prepare(channelId, said, lang, token)
        : { messageText: VOICE_LABEL[lang], extra: { v: 1, kind: "text", orig: { lang, text: VOICE_LABEL[lang] }, tr: VOICE_LABEL }, guard: { issues: [], blocking: false } };
      const voice = { ...p, extra: { ...p.extra, kind: "voice_note" as const, audioUrl: heard.audioUrl, audioDurationSec: seconds } };
      if (voice.guard.blocking) setHeld(voice);
      else await deliver(voice, false);
    } catch {
      setFailed("Couldn't send the voice note. Check your connection and try again.");
    }
    setSending(false);
  }

  const recorder = useVoiceRecorder(MAX_VOICE_SEC, (r) => void sendVoice(r));
  const recording = recorder.seconds !== null;

  async function send(body = text) {
    if (!body || sending || disabled || recording) return;
    setSending(true);
    setFailed(null);
    const prepared = await prepare(channelId, body, lang, token);
    // Pause for blocking issues, and for harsh tone (D-024: never blocking, but offer a softer version).
    if (prepared.guard.blocking || softerText(body, prepared.guard.issues)) setHeld(prepared);
    else await deliver(prepared, false);
    setSending(false);
  }

  return (
    <div className="flex flex-col gap-1 border-t border-border bg-bg pt-3">
      {held && (
        <GuardSheet
          voice={held.extra.kind === "voice_note"}
          text={held.messageText}
          issues={held.guard.issues}
          blocking={held.guard.blocking}
          lang={lang}
          onEdit={() => setHeld(null)}
          onUseSuggestion={(span, suggestion) => {
            setDraft((d) => d.replace(span, suggestion));
            setHeld(null);
          }}
          onSendAnyway={async () => {
            const p = held;
            setHeld(null);
            setSending(true);
            await deliver(p, true);
            setSending(false);
          }}
          onSendSofter={(softer) => {
            setHeld(null);
            setDraft(softer); // if sending fails, the softer draft stays to retry
            void send(softer);
          }}
        />
      )}
      {failed && (
        <p role="alert" className="note note-error">
          {failed}
        </p>
      )}
      {recording ? (
        <div className="note note-error flex min-h-tap items-center gap-2 py-1 pr-1" role="group" aria-label="Recording a voice note">
          <span aria-hidden="true" className="size-2.5 shrink-0 bg-danger motion-safe:animate-pulse" />
          <p className="agate flex-1 text-sm" aria-live="off">
            Recording {clock(recorder.seconds ?? 0)} / {clock(MAX_VOICE_SEC)}
          </p>
          <button type="button" onClick={() => void recorder.cancel()} className="btn btn-quiet">
            Cancel
          </button>
          <button type="button" autoFocus onClick={() => void recorder.stop()} className="btn btn-primary">
            Send
          </button>
        </div>
      ) : (
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <button
          type="button"
          disabled={disabled || sending}
          onClick={async () => {
            setFailed(null);
            const problem = await recorder.start();
            if (problem) setFailed(problem);
          }}
          aria-label="Record a voice note"
          title="Record a voice note"
          className="btn btn-icon shrink-0"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <textarea
          lang={lang}
          rows={1}
          maxLength={MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          aria-label="Message"
          placeholder={disabled ? "Connecting…" : "Write a message"}
          className="field max-h-32 resize-none [field-sizing:content]"
        />
        <button
          type="submit"
          disabled={!text || sending || disabled}
          aria-busy={sending}
          className="btn btn-primary shrink-0"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
      )}
      {draft.length > MAX - 100 && (
        <p className="agate self-end text-sm text-muted">
          {draft.length}/{MAX}
        </p>
      )}
    </div>
  );
}
