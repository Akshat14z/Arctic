"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatListResponseSchema, type ChatSummary } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { localeFor } from "@/lib/format";
import { useRequireSession } from "@/lib/use-require-session";

export function Inbox() {
  const session = useRequireSession();
  const token = session?.sessionToken;
  const [items, setItems] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let live = true;
    setError(null);
    api("/api/chats", { token, schema: ChatListResponseSchema }).then(
      (r) => live && setItems(r.items),
      (e) => live && setError(friendlyMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [token, attempt]);

  const lang = session?.user.language ?? "en";

  return (
    <section className="flex flex-col gap-4">
      <h1 className="page-title">Chats</h1>

      {error && (
        <div role="alert" className="note note-error flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet shrink-0">
            Try again
          </button>
        </div>
      )}

      {!items && !error && (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="skeleton h-[76px]" />
          ))}
        </ul>
      )}

      {items?.length === 0 && (
        <div className="tile items-start">
          <h2 className="item-title">No chats yet.</h2>
          <p className="text-muted">Find something you like and tap “Chat with seller”.</p>
          <Link href="/listings" className="btn btn-primary">
            Browse listings
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="tile gap-0 py-2">
          {items.map((c) => (
            <li key={c.channelId} className="border-t border-border first:border-t-0">
              <Link
                href={`/chats/${encodeURIComponent(c.channelId)}`}
                className="row py-3"
              >
                <span className="row-icon" aria-hidden>
                  {c.otherUser.displayName.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="row-title text-base">{c.otherUser.displayName}</h2>
                    {c.lastMessage && (
                      <time dateTime={c.lastMessage.at} className="agate shrink-0 text-sm text-muted">
                        {new Date(c.lastMessage.at).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
                      </time>
                    )}
                  </div>
                  <p lang={c.listing.lang} className="meta truncate">
                    {c.listing.title}
                  </p>
                  {c.lastMessage && <p className="mt-0.5 truncate">{c.lastMessage.text}</p>}
                </div>
                {c.unreadCount > 0 && (
                  <span className="agate min-w-6 shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-center text-sm text-brand-fg" aria-label={`${c.unreadCount} unread`}>
                    {c.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
