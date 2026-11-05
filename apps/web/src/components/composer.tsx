"use client";

import { useRef, useState } from "react";
import {
  PreparedMessageSchema,
  TranscribeAudioResponseSchema,
  type HandshakeExtraV1,
  type LangCode,
} from "@convocart/contracts";
import { api } from "@/lib/api/client";
import { sendText, type ChannelRef, type ChatMessage } from "@/lib/nexconn";

// `extra` must stay under ~8 KB (DHRUMIL-006); Indic text is ~3 bytes/char and `tr` repeats it per language.
const MAX = 1000;
const PREPARE_BUDGET_MS = 8000;

type Props = {
  channel: ChannelRef;
  channelId: string;
  lang: LangCode;
  token: string;
  disabled: boolean;
  onSent: (m: ChatMessage) => void;
};

/** Translation + Meaning Guard via /prepare; if it fails or is slow, send the original anyway (ARCHITECTURE §4.2). */
async function prepare(channelId: string, text: string, lang: LangCode, token: string) {
  const fallback = { messageText: text, extra: { v: 1, kind: "text", orig: { lang, text }, tr: {} } satisfies HandshakeExtraV1 };
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

export function Composer({ channel, channelId, lang, token, disabled, onSent }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const text = draft.trim();

  async function send() {
    if (!text || sending || disabled || recording || transcribing) return;
    setSending(true);
    setFailed(null);
    try {
      const { messageText, extra } = await prepare(channelId, text, lang, token);
      onSent(await sendText(channel, messageText, JSON.stringify(extra)));
      setDraft("");
    } catch {
      setFailed("Couldn't send. Check your connection and tap Send again.");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (disabled || sending || transcribing || recording) return;
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      alert("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordDuration(0);
      setFailed(null);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 60) {
            stopAndSendRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Could not access microphone. Please allow microphone permission in your browser.");
    }
  }

  function cancelRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Track stop error:", e);
      }
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setRecording(false);
    setRecordDuration(0);
  }

  async function stopAndSendRecording() {
    if (!mediaRecorderRef.current || transcribing) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = recordDuration;
    setTranscribing(true);
    setFailed(null);

    const recorder = mediaRecorderRef.current;
    const currentStream = recorder.stream;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        try {
          currentStream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn("Track stop error:", e);
        }
        resolve();
      };
      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        resolve();
      }
    });

    try {
      const mimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size < 100) {
        alert("Voice memo was too brief. Please speak into your microphone and try again.");
        return;
      }

      // Convert blob to base64
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      let transcriptText = "";
      let audioFinalUrl: string = base64DataUrl;

      // Attempt speech-to-text transcription via backend
      try {
        const transcribeRes = await api("/api/messages/transcribe", {
          method: "POST",
          body: {
            audioBase64: base64DataUrl,
            mimeType,
            senderLang: lang,
          },
          token,
          schema: TranscribeAudioResponseSchema,
        });

        if (transcribeRes.transcription?.trim()) {
          transcriptText = transcribeRes.transcription.trim();
        }
        if (transcribeRes.audioUrl) {
          audioFinalUrl = transcribeRes.audioUrl;
        }
      } catch (transcribeErr) {
        console.warn("[Voice] Speech transcription error, falling back to audio-only delivery:", transcribeErr);
      }

      // Localized placeholder so voice notes always deliver even if speech is faint or silence
      const fallbackMemoLabel: Record<LangCode, string> = {
        en: "🎙️ Voice memo",
        hi: "🎙️ वॉयस संदेश",
        ja: "🎙️ 音声メッセージ",
        ta: "🎙️ குரல் செய்தி",
        te: "🎙️ వాయిస్ సందేశం",
        kn: "🎙️ ಧ್ವನಿ ಸಂದೇಶ",
        bn: "🎙️ ভয়েস বার্তা",
        mr: "🎙️ व्हॉइस मेसेज",
      };

      const effectiveText = transcriptText || fallbackMemoLabel[lang] || "🎙️ Voice memo";

      // Prepare translation & Meaning Guard for the transcribed / fallback text
      const { messageText, extra } = await prepare(channelId, effectiveText, lang, token);

      // Send message with kind: "voice_note", audioUrl, audioDurationSec
      const voiceExtra: HandshakeExtraV1 = {
        ...extra,
        kind: "voice_note",
        audioUrl: audioFinalUrl,
        audioDurationSec: duration,
      };

      const sentMsg = await sendText(channel, messageText, JSON.stringify(voiceExtra));
      onSent(sentMsg);
    } catch (err) {
      console.error("Failed to send voice memo:", err);
      setFailed("Couldn't send voice memo. Please try again.");
    } finally {
      setRecording(false);
      setTranscribing(false);
      setRecordDuration(0);
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
    }
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-1 border-t border-border bg-bg pt-3">
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {failed}
        </p>
      )}

      {/* RECORDING IN PROGRESS VIEW */}
      {recording ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-950/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-400">
              {transcribing ? "Sending voice memo…" : `Recording (${formatTimer(recordDuration)})`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={transcribing}
              onClick={cancelRecording}
              className="rounded-full px-3 py-1 text-xs font-semibold text-muted hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={transcribing}
              onClick={stopAndSendRecording}
              className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand/90 transition disabled:opacity-50"
            >
              {transcribing ? "Sending…" : "✔️ Send Memo"}
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD COMPOSER VIEW */
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <button
            type="button"
            title="Record voice memo"
            disabled={disabled || sending}
            onClick={startRecording}
            className="flex min-h-tap w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-lg hover:bg-surface-elevated active:scale-95 transition disabled:opacity-50"
          >
            🎙️
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
            placeholder={disabled ? "Connecting…" : "Write a message or tap 🎙️"}
            className="max-h-32 min-h-tap w-full resize-none rounded-2xl border border-border bg-surface px-3 py-2.5 text-base [field-sizing:content]"
          />

          <button
            type="submit"
            disabled={!text || sending || disabled}
            className="min-h-tap shrink-0 rounded-full bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      )}

      {draft.length > MAX - 100 && (
        <p className="self-end text-xs text-muted">
          {draft.length}/{MAX}
        </p>
      )}
    </div>
  );
}
