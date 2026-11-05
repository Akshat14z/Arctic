"use client";

import { useState } from "react";
import type { LangCode } from "@convocart/contracts";
import type { ChatMessage } from "@/lib/nexconn";
import { LANGUAGES } from "@/lib/languages";
import { localeFor } from "@/lib/format";
import { parseExtra, pickDisplay } from "@/lib/render";

export function MessageBubble({ message, lang }: { message: ChatMessage; lang: LangCode }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const extra = parseExtra(message.extra);
  const time = new Date(message.sentAt).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });

  if (extra?.kind === "system" && extra.system) {
    return (
      <p className="self-center rounded-full bg-surface px-3 py-1 text-center text-sm text-muted">
        {extra.system.text[lang] ?? extra.system.text.en ?? message.text}
      </p>
    );
  }

  const shown = pickDisplay(extra, message.text, lang, showOriginal);
  const origName = extra && LANGUAGES.find((l) => l.code === extra.orig.lang)?.native;

  return (
    <div className={`flex max-w-[85%] flex-col gap-1 ${message.mine ? "items-end self-end" : "items-start self-start"}`}>
      <div
        lang={shown.lang}
        className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
          message.mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md border border-border bg-surface"
        }`}
      >
        {shown.text}
      </div>
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
