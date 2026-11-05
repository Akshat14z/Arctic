"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthResponse } from "@convocart/contracts";
import { friendlyMessage } from "@/lib/api/client";
import { ensureConnected, useConnectionState } from "@/lib/chat-connection";
import { loadHistory, onMessages, sameChannel, type ChannelRef, type ChatMessage } from "@/lib/nexconn";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";

/** Adds messages, dropping duplicates (history reloads, our own echo), oldest first. */
function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

type Props = {
  session: AuthResponse;
  channel: ChannelRef;
  /** Our channel id, sent to /prepare so the server knows whose languages to translate into. */
  channelId: string;
  emptyText: string;
  /** Set when sending isn't allowed (e.g. a resolved case); shown in place of the composer. */
  closedText?: string;
};

/** Messages, history, live updates and the composer for one Nexconn channel. */
export function ChatThread({ session, channel, channelId, emptyText, closedText }: Props) {
  const state = useConnectionState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lang = session.user.language;

  // Connect once per page load. `session` is left out on purpose: ensureConnected saves a refreshed
  // session, which would re-run this.
  useEffect(() => {
    ensureConnected(session).catch((e) => setError(friendlyMessage(e)));
  }, [channel.type, channel.id]);

  // History whenever we (re)connect, so a reconnect catches up; live messages for this channel.
  useEffect(() => {
    if (state !== "connected") return;
    let live = true;
    setError(null);
    loadHistory(channel).then(
      (h) => live && setMessages((m) => merge(m, h)),
      () => live && setError("We couldn't load earlier messages."),
    );
    const off = onMessages((incoming) => setMessages((m) => merge(m, incoming.filter((x) => sameChannel(x.channel, channel)))));
    return () => {
      live = false;
      off();
    };
    // Keyed on the channel's type + id (not the object) so a new-but-equal ref doesn't resubscribe.
  }, [channel.type, channel.id, state]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" }); // braces: scroll methods may return a Promise, effects must not
  }, [messages.length]);

  return (
    <>
      {state !== "connected" && (
        <p role="status" className="mt-3 rounded-lg bg-guard-bg px-3 py-2 text-sm text-guard">
          {state === "disconnected" ? "Chat is offline. Reconnecting…" : "Connecting to chat…"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3 py-4" aria-live="polite">
        {messages.length === 0 && state === "connected" && !error && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">{emptyText}</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} lang={lang} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 pb-4">
        {closedText ? (
          <p className="border-t border-border bg-bg pt-3 text-center text-sm text-muted">{closedText}</p>
        ) : (
          <Composer
            channel={channel}
            channelId={channelId}
            lang={lang}
            token={session.sessionToken}
            disabled={state !== "connected"}
            onSent={(m) => setMessages((list) => merge(list, [m]))}
          />
        )}
      </div>
    </>
  );
}
