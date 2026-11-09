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
import { CallButton } from "@/components/call-button";

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
        <h1 className="page-title">{error.notFound ? "Chat not found" : "Couldn't open this chat"}</h1>
        <p className="text-muted">{error.notFound ? "It may belong to someone else, or the link is old." : error.text}</p>
        {error.notFound ? (
          <Link href="/chats" className="btn btn-primary">
            Your chats
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !chat || !other || !channel)
    return (
      <div aria-busy className="flex flex-col gap-4">
        <div className="skeleton h-16" />
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton ml-auto h-12 w-1/2" />
      </div>
    );

  return (
    <section className="-mt-4 -mb-24 flex min-h-[calc(100dvh-4rem)] flex-col md:-mb-8">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-bg py-2">
        <Link href="/chats" aria-label="Back to chats" className="btn btn-icon shrink-0">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{other.displayName}</h1>
          <Link
            href={`/listings/${chat.listing.id}`}
            className="flex min-w-0 items-baseline gap-2 text-sm text-muted underline decoration-border underline-offset-2 hover:decoration-text"
          >
            <span lang={chat.listing.lang} className="truncate">{chat.listing.title}</span>
            <span className="agate shrink-0 text-text">{formatPrice(chat.listing.price, session.user.language)}</span>
          </Link>
        </div>
        <CallButton peerId={other.id} peerName={other.displayName} myName={session.user.displayName} />
        {chat.openCaseId ? (
          <Link
            href={`/cases/${encodeURIComponent(chat.openCaseId)}`}
            className="btn btn-secondary shrink-0 px-3 text-sm"
          >
            Help requested
          </Link>
        ) : (
          <GetHelp channelId={chat.channelId} token={session.sessionToken} />
        )}
      </header>

      <ChatThread
        session={session}
        channel={channel}
        channelId={chat.channelId}
        emptyText={`Say hello. ${other.displayName} reads your messages in their own language.`}
        deals={{
          myRole: chat.buyerId === me ? "buyer" : "seller",
          names: { buyer: chat.buyer.displayName, seller: chat.seller.displayName },
          canPropose: true,
        }}
      />
    </section>
  );
}
