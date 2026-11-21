"use client";

import { useState } from "react";
import type { LangCode } from "@convocart/contracts";
import type { ChatMessage } from "@/lib/nexconn";
import { LANGUAGES } from "@/lib/languages";
import { localeFor } from "@/lib/format";
import { parseExtra, pickDisplay } from "@/lib/render";
import { apiUrl } from "@/lib/api/client";
import { useSpeech } from "@/lib/speak";

export function MessageBubble({ message, lang }: { message: ChatMessage; lang: LangCode }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [audioGone, setAudioGone] = useState(false);
  const [copied, setCopied] = useState(false);
  const extra = parseExtra(message.extra);
  const time = new Date(message.sentAt).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });

  const shown = pickDisplay(extra, message.text, lang, showOriginal);
  const origName = extra && LANGUAGES.find((l) => l.code === extra.orig.lang)?.native;
  const targetName = LANGUAGES.find((l) => l.code === lang)?.native ?? lang.toUpperCase();

  // Read aloud in the language actually shown (the reader's translation, or the original when toggled).
  const speech = useSpeech(message.id, shown.lang ?? lang);

  if (extra?.kind === "system" && extra.system) {
    const scam = extra.system.event === "scam_warning";
    return (
      <p
        role={scam ? "alert" : undefined}
        className={scam ? "note note-error self-stretch font-medium" : "meta self-center border-y border-border px-3 py-1 text-center"}
      >
        {extra.system.text[lang] ?? extra.system.text.en ?? message.text}
      </p>
    );
  }

  // The sender was warned by Meaning Guard and sent it anyway: warn the reader too.
  const scam = !message.mine && extra?.guard?.issues.some((i) => i.kind === "scam_signal");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shown.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={`flex max-w-[85%] flex-col gap-1.5 ${message.mine ? "items-end self-end" : "items-start self-start"}`}>
      {/* Sender indicator for incoming */}
      {!message.mine && message.from && (
        <span className="agate px-1 text-[11px] font-semibold text-muted">
          {message.from}
        </span>
      )}

      {/* Bubble container */}
      <div
        lang={shown.lang}
        className={`group relative flex flex-col gap-1 break-words [overflow-wrap:anywhere] ${
          message.mine ? "bubble bubble-mine shadow-xs" : "bubble shadow-xs"
        }`}
      >
        {/* Voice Note Audio Player */}
        {extra?.kind === "voice_note" && extra.audioUrl && (
          <span className="mb-1 flex flex-col gap-1">
            {audioGone ? (
              <span className="text-sm italic">This voice recording is no longer available.</span>
            ) : (
              <audio
                controls
                preload="metadata"
                src={apiUrl(extra.audioUrl)}
                onError={() => setAudioGone(true)}
                aria-label={`Voice note${extra.audioDurationSec ? `, ${extra.audioDurationSec} seconds` : ""}`}
                className="h-10 w-64 max-w-full"
              />
            )}
          </span>
        )}

        {/* Message Text */}
        <p className="whitespace-pre-wrap leading-relaxed">{shown.text}</p>

        {/* Translation Indicator Badge */}
        {shown.translated && !showOriginal && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] opacity-75 font-medium">
            <span>🌐 Translated to {targetName}</span>
          </span>
        )}
      </div>

      {/* Scam Warning Alert */}
      {scam && (
        <p role="alert" className="note note-error max-w-full text-xs">
          <strong>Security Notice:</strong> This message asks to move off-platform. Off-platform deals lack Handshake Seal protection.
        </p>
      )}

      {/* Metadata & Actions row */}
      <div className="meta flex flex-wrap items-center gap-x-2 text-xs">
        <time dateTime={new Date(message.sentAt).toISOString()} className="agate">
          {time}
        </time>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy message text"
          className="text-muted hover:text-text transition-colors"
          title="Copy text"
        >
          {copied ? "Copied" : "Copy"}
        </button>

        {/* Speech Read-Aloud */}
        {speech.available && shown.text.trim() && (
          <button
            type="button"
            onClick={() => speech.toggle(shown.text)}
            aria-pressed={speech.active}
            aria-label={speech.active ? "Stop reading aloud" : "Read aloud"}
            className="inline-flex items-center gap-1 text-muted hover:text-text transition-colors"
          >
            {speech.active ? "■ Stop" : "🔊 Listen"}
          </button>
        )}

        {/* Toggle Original / Translation */}
        {shown.canToggle && (
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="font-medium underline decoration-border hover:decoration-text hover:text-text transition-colors"
            aria-pressed={showOriginal}
          >
            {showOriginal ? (
              `Show ${targetName} translation`
            ) : (
              <>See original ({origName ?? extra?.orig.lang})</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
