"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatDetailResponseSchema, type ChatDetailResponse } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { ensureConnected, useConnectionState } from "@/lib/chat-connection";
import { formatPrice } from "@/lib/format";
import { loadHistory, onMessages, sameChannel, type ChannelRef, type ChatMessage } from "@/lib/nexconn";
import { useRequireSession } from "@/lib/use-require-session";
import { Composer } from "@/components/composer";
import { MessageBubble } from "@/components/message-bubble";

/** Adds messages, dropping duplicates (history reloads, our own echo), oldest first. */
function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

export function Conversation() {
  const { id } = useParams<{ id: string }>();
  const session = useRequireSession();
  const token = session?.sessionToken;
  const state = useConnectionState();
  const [chat, setChat] = useState<ChatDetailResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  // 1. The chat itself (who, which listing) from our server.
  useEffect(() => {
    if (!token) return;
    let live = true;
    setError(null);
    api(`/api/chats/${encodeURIComponent(id)}`, { token, schema: ChatDetailResponseSchema }).then(
      (c) => live && setChat(c),
      (e) => live && setError({ text: friendlyMessage(e), notFound: e instanceof ApiError && (e.status === 404 || e.status === 403) }),
    );
    return () => {
      live = false;
    };
  }, [id, token, attempt]);

  const me = session?.user.id;
  const other = chat && (chat.buyerId === me ? chat.seller : chat.buyer);
  // Until the server creates a group per chat (D-029, DHRUMIL-008), it reports "direct": talk to the other user.
  const kind: string = chat?.channelType ?? "";
  const channel = useMemo<ChannelRef | null>(
    () => (!chat || !other ? null : kind === "group" ? { type: "group", id: chat.channelId } : { type: "direct", id: other.id }),
    [chat, other, kind],
  );

  // 2. Connect once per page load.
  useEffect(() => {
    if (!session || !channel) return;
    ensureConnected(session).catch((e) => setError({ text: friendlyMessage(e), notFound: false }));
    // `session` is left out on purpose: ensureConnected saves a refreshed session, which would re-run this.
  }, [channel, attempt]);

  // 3. History whenever we (re)connect, so a reconnect catches up; live messages for this channel.
  useEffect(() => {
    if (!channel || state !== "connected") return;
    let live = true;
    loadHistory(channel).then(
      (h) => live && setMessages((m) => merge(m, h)),
      () => live && setError({ text: "We couldn't load earlier messages.", notFound: false }),
    );
    const off = onMessages((incoming) => setMessages((m) => merge(m, incoming.filter((x) => sameChannel(x.channel, channel)))));
    return () => {
      live = false;
      off();
    };
  }, [channel, state]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" }); // braces: scroll methods may return a Promise, effects must not
  }, [messages.length]);

  if (error && (error.notFound || !chat)) {
    return (
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="text-2xl font-semibold">{error.notFound ? "Chat not found" : "Couldn't open this chat"}</h1>
        <p className="text-muted">{error.notFound ? "It may belong to someone else, or the link is old." : error.text}</p>
        {error.notFound ? (
          <Link href="/chats" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Your chats
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !chat || !other || !channel) return <div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />;
  const lang = session.user.language;

  return (
    <section className="-my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg py-3">
        <Link href="/chats" aria-label="Back to chats" className="flex min-h-tap min-w-tap items-center justify-center rounded-lg text-xl">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.displayName}</p>
          <Link href={`/listings/${chat.listing.id}`} className="block truncate text-sm text-muted underline-offset-2 hover:underline">
            <span lang={chat.listing.lang}>{chat.listing.title}</span> · {formatPrice(chat.listing.price, lang)}
          </Link>
        </div>
      </header>

      {state !== "connected" && (
        <p role="status" className="mt-3 rounded-lg bg-guard-bg px-3 py-2 text-sm text-guard">
          {state === "disconnected" ? "Chat is offline. Reconnecting…" : "Connecting to chat…"}
        </p>
      )}
      {error && !error.notFound && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {error.text}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3 py-4" aria-live="polite">
        {messages.length === 0 && state === "connected" && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">
            Say hello. {other.displayName} reads your messages in their own language.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} lang={lang} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 pb-4">
        <Composer
          channel={channel}
          channelId={chat.channelId}
          lang={lang}
          token={session.sessionToken}
          disabled={state !== "connected"}
          onSent={(m) => setMessages((list) => merge(list, [m]))}
        />
      </div>
    </section>
  );
}
