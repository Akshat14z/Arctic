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
      <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-danger-bg px-3 py-2 text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap font-medium underline">
            Try again
          </button>
        </div>
      )}

      {!items && !error && (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[72px] animate-pulse rounded-xl bg-surface" />
          ))}
        </ul>
      )}

      {items?.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <p className="font-medium">No chats yet.</p>
          <p className="text-muted">Find something you like and tap “Chat with seller”.</p>
          <Link href="/listings" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Browse listings
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.channelId}>
              <Link
                href={`/chats/${encodeURIComponent(c.channelId)}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-brand"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium">{c.otherUser.displayName}</p>
                    {c.lastMessage && (
                      <time dateTime={c.lastMessage.at} className="shrink-0 text-xs text-muted">
                        {new Date(c.lastMessage.at).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
                      </time>
                    )}
                  </div>
                  <p lang={c.listing.lang} className="truncate text-sm text-muted">
                    {c.listing.title}
                  </p>
                  {c.lastMessage && <p className="truncate text-sm">{c.lastMessage.text}</p>}
                </div>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-fg" aria-label={`${c.unreadCount} unread`}>
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
