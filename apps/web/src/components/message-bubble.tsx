"use client";

import { useState } from "react";
import type { LangCode } from "@convocart/contracts";
import type { ChatMessage } from "@/lib/nexconn";
import { LANGUAGES } from "@/lib/languages";
import { localeFor } from "@/lib/format";
import { parseExtra, pickDisplay } from "@/lib/render";
import { apiUrl } from "@/lib/api/client";

export function MessageBubble({ message, lang }: { message: ChatMessage; lang: LangCode }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [audioGone, setAudioGone] = useState(false);
  const extra = parseExtra(message.extra);
  const time = new Date(message.sentAt).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });

  if (extra?.kind === "system" && extra.system) {
    const scam = extra.system.event === "scam_warning";
    return (
      <p
        role={scam ? "alert" : undefined}
        className={`self-center rounded-2xl px-3 py-1 text-center text-sm ${scam ? "bg-danger-bg font-medium text-danger" : "bg-surface text-muted"}`}
      >
        {extra.system.text[lang] ?? extra.system.text.en ?? message.text}
      </p>
    );
  }

  const shown = pickDisplay(extra, message.text, lang, showOriginal);
  const origName = extra && LANGUAGES.find((l) => l.code === extra.orig.lang)?.native;
  // The sender was warned by Meaning Guard and sent it anyway: warn the reader too.
  const scam = !message.mine && extra?.guard?.issues.some((i) => i.kind === "scam_signal");

  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${message.mine ? "items-end self-end" : "items-start self-start"}`}>
      <div
        lang={shown.lang}
        className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
          message.mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md border border-border bg-surface"
        }`}
      >
        {extra?.kind === "voice_note" && extra.audioUrl && (
          <span className="mb-1 flex flex-col gap-1">
            {audioGone ? (
              <span className="text-sm opacity-80">This voice recording is no longer available.</span>
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
        {shown.text}
      </div>
      {scam && (
        <p role="alert" className="max-w-full rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <strong>Be careful.</strong> This asks to move the deal or payment off Handshake. Payments outside Handshake
          aren&apos;t protected, and we can&apos;t help if something goes wrong.
        </p>
      )}
      <div className="flex items-center gap-2 px-1 text-xs text-muted">
        <time dateTime={new Date(message.sentAt).toISOString()}>{time}</time>
        {shown.canToggle && (
          <button type="button" onClick={() => setShowOriginal((v) => !v)} className="min-h-6 underline" aria-pressed={showOriginal}>
            {showOriginal ? "Show translation" : <>See original (<span lang={extra?.orig.lang}>{origName}</span>)</>}
          </button>
        )}
      </div>
    </div>
  );
}
