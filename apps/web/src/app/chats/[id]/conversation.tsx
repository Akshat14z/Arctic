"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChatDetailResponseSchema, type ChatDetailResponse } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import type { ChannelRef } from "@/lib/nexconn";
import { useRequireSession } from "@/lib/use-require-session";
import { ChatThread } from "@/components/chat-thread";
import { GetHelp } from "@/components/get-help";

export function Conversation() {
  const { id } = useParams<{ id: string }>();
  const session = useRequireSession();
  const token = session?.sessionToken;
  const [chat, setChat] = useState<ChatDetailResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

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

  if (error) {
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

  return (
    <section className="-my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg py-3">
        <Link href="/chats" aria-label="Back to chats" className="flex min-h-tap min-w-tap items-center justify-center rounded-lg text-xl">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.displayName}</p>
          <Link href={`/listings/${chat.listing.id}`} className="block truncate text-sm text-muted underline-offset-2 hover:underline">
            <span lang={chat.listing.lang}>{chat.listing.title}</span> · {formatPrice(chat.listing.price, session.user.language)}
          </Link>
        </div>
        <GetHelp channelId={chat.channelId} token={session.sessionToken} />
      </header>

      <ChatThread
        session={session}
        channel={channel}
        channelId={chat.channelId}
        emptyText={`Say hello. ${other.displayName} reads your messages in their own language.`}
      />
    </section>
  );
}
