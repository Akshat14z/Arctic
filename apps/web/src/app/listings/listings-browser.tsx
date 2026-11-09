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
      <h1 className="page-title">Browse</h1>

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
          className="field"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Search
        </button>
      </form>

      {error && (
        <div role="alert" className="note note-error flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet shrink-0">
            Try again
          </button>
        </div>
      )}

      {!page && !error && (
        <ul aria-busy className="tile gap-0 py-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex gap-3 border-b border-border py-4 last:border-b-0">
              <div className="skeleton size-14 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {page && page.items.length === 0 && (
        <div className="tile items-start">
          <h2 className="section-title">{q ? `Nothing matches "${q}".` : "No listings yet."}</h2>
          <p className="text-muted">{q ? "Try a shorter word." : "Be the first to post something for sale."}</p>
          <Link href="/listings/new" className="btn btn-primary">
            Post a listing
          </Link>
        </div>
      )}

      {page && page.items.length > 0 && (
        <ul className="tile gap-0 py-2">
          {page.items.map((l) => (
            <li key={l.id} className="border-b border-border last:border-b-0">
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
          aria-busy={loadingMore}
          className="btn btn-secondary self-center"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}
