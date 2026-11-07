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
        className={scam ? "note note-error self-stretch font-medium" : "meta self-center border-y border-border px-3 py-1 text-center"}
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
        className={message.mine ? "bubble bubble-mine" : "bubble"}
      >
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
        {shown.text}
      </div>
      {scam && (
        <p role="alert" className="note note-error max-w-full">
          <strong>Be careful.</strong> This asks to move the deal or payment off Handshake. Payments outside Handshake
          aren&apos;t protected, and we can&apos;t help if something goes wrong.
        </p>
      )}
      <div className="meta flex flex-wrap items-center gap-x-3">
        <time dateTime={new Date(message.sentAt).toISOString()} className="agate">{time}</time>
        {shown.canToggle && (
          <button type="button" onClick={() => setShowOriginal((v) => !v)} className="min-h-tap underline decoration-border underline-offset-2 transition-colors hover:text-text hover:decoration-text" aria-pressed={showOriginal}>
            {showOriginal ? "Show translation" : <>See original (<span lang={extra?.orig.lang}>{origName}</span>)</>}
          </button>
        )}
      </div>
    </div>
  );
}
