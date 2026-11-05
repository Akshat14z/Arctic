"use client";

import { useState } from "react";
import { PreparedMessageSchema, type HandshakeExtraV1, type LangCode } from "@convocart/contracts";
import { api } from "@/lib/api/client";
import { sendText, type ChannelRef, type ChatMessage } from "@/lib/nexconn";

// `extra` must stay under ~8 KB (DHRUMIL-006); Indic text is ~3 bytes/char and `tr` repeats it per language.
const MAX = 1000;
const PREPARE_BUDGET_MS = 4000;

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
    // ponytail: guard.blocking is ignored until the Meaning Guard sheet (DHRUMIL-T09) exists.
    return (await Promise.race([call, timeout])) ?? fallback;
  } catch {
    return fallback;
  }
}

export function Composer({ channel, channelId, lang, token, disabled, onSent }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = draft.trim();

  async function send() {
    if (!text || sending || disabled) return;
    setSending(true);
    setFailed(false);
    try {
      const { messageText, extra } = await prepare(channelId, text, lang, token);
      onSent(await sendText(channel, messageText, JSON.stringify(extra)));
      setDraft("");
    } catch {
      setFailed(true); // keep the draft so nothing is lost
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-t border-border bg-bg pt-3">
      {failed && (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t send. Check your connection and tap Send again.
        </p>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
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
      {draft.length > MAX - 100 && (
        <p className="self-end text-xs text-muted">
          {draft.length}/{MAX}
        </p>
      )}
    </div>
  );
}
