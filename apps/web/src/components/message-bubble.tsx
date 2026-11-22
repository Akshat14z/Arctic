"use client";

import { useState } from "react";
import type { LangCode } from "@convocart/contracts";
import type { ChatMessage } from "@/lib/nexconn";
import { LANGUAGES } from "@/lib/languages";
import { localeFor } from "@/lib/format";
import { parseExtra, pickDisplay } from "@/lib/render";
import { apiUrl } from "@/lib/api/client";
import { useSpeech } from "@/lib/speak";
import { translator } from "@/lib/i18n";

export function MessageBubble({ message, lang }: { message: ChatMessage; lang: LangCode }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [audioGone, setAudioGone] = useState(false);
  const [copied, setCopied] = useState(false);
  const extra = parseExtra(message.extra);
  const time = new Date(message.sentAt).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });

  const shown = pickDisplay(extra, message.text, lang, showOriginal);
  const origName = extra && LANGUAGES.find((l) => l.code === extra.orig.lang)?.native;
  const targetName = LANGUAGES.find((l) => l.code === lang)?.native ?? lang.toUpperCase();
  const t = translator(lang);

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

      </div>

      {/* Scam Warning Alert */}
      {scam && (
        <p role="alert" className="note note-error max-w-full text-xs">
          <strong>Security Notice:</strong> This message asks to move off-platform. Off-platform deals lack CommonGrounds Seal protection.
        </p>
      )}

      {/* Metadata & Actions row */}
      <div className="meta flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <time dateTime={new Date(message.sentAt).toISOString()} className="agate">
          {time}
        </time>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="hit text-muted transition-colors hover:text-text"
        >
          {copied ? t("chat.copied") : t("chat.copy")}
        </button>

        {/* Speech Read-Aloud */}
        {speech.available && shown.text.trim() && (
          <button
            type="button"
            onClick={() => speech.toggle(shown.text)}
            aria-pressed={speech.active}
            className="hit inline-flex items-center gap-1 text-muted transition-colors hover:text-text"
          >
            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              {speech.active ? <rect x="2.5" y="2.5" width="7" height="7" rx="1" /> : <path d="M1.5 4.5h2l3-2.5v8l-3-2.5h-2zM8.5 3.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.2" fill="none" />}
            </svg>
            {speech.active ? t("chat.stop") : t("chat.listen")}
          </button>
        )}

        {/* Toggle Original / Translation */}
        {shown.canToggle && (
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="hit font-medium underline decoration-border transition-colors hover:text-text hover:decoration-text"
            aria-pressed={showOriginal}
          >
            {showOriginal ? (
              t("chat.showTranslation", { lang: targetName })
            ) : (
              t("chat.seeOriginal", { lang: origName ?? extra?.orig.lang ?? "" })
            )}
          </button>
        )}
      </div>
    </div>
  );
}
