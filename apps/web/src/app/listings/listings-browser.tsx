"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingListResponseSchema, type Listing } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";

type Page = { items: Listing[]; nextCursor?: string };

export function ListingsBrowser() {
  const session = useSession();
  const hydrated = session !== undefined;
  const lang = session?.user.language ?? "en";
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fetchPage = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams({ lang });
      if (q) params.set("q", q);
      if (cursor) params.set("cursor", cursor);
      return api(`/api/listings?${params}`, { schema: ListingListResponseSchema });
    },
    [q, lang],
  );

  useEffect(() => {
    if (!hydrated) return; // wait for the session so we fetch once, in the right language
    let live = true;
    setPage(null);
    setError(null);
    fetchPage().then(
      (p) => live && setPage(p),
      (e) => live && setError(friendlyMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [fetchPage, attempt, hydrated]);

  async function loadMore() {
    if (!page?.nextCursor) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(page.nextCursor);
      setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor });
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search listings"
          aria-label="Search listings"
          className="min-h-tap w-full rounded-lg border border-border bg-surface px-3 text-base"
        />
        <button type="submit" className="min-h-tap rounded-lg border border-border bg-surface px-4 font-medium">
          Search
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-danger-bg px-3 py-2 text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap font-medium underline">
            Try again
          </button>
        </div>
      )}

      {!page && !error && (
        <ul aria-busy className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[106px] animate-pulse rounded-xl bg-surface" />
          ))}
        </ul>
      )}

      {page && page.items.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6">
          <p className="font-medium">{q ? `Nothing matches "${q}".` : "No listings yet."}</p>
          <p className="text-muted">{q ? "Try a shorter word." : "Be the first to post something for sale."}</p>
          <Link href="/listings/new" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Post a listing
          </Link>
        </div>
      )}

      {page && page.items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {page.items.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      {page?.nextCursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="min-h-tap self-center rounded-lg border border-border bg-surface px-4 font-medium disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}
