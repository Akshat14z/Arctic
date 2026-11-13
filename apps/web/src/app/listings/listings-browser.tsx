"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingListResponseSchema, type Listing } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";

type Page = { items: Listing[]; nextCursor?: string };

/** Browse: search, an All / Yours switch for signed-in people, and a photo grid of listings. */
export function ListingsBrowser() {
  const session = useSession();
  const hydrated = session !== undefined;
  const lang = session?.user.language ?? "en";
  const canSell = !!session && session.user.role !== "agent";
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // "My listings" (account menu) links here with ?mine=1. Read after mount; keep the URL in step when it changes.
  useEffect(() => {
    setMine(new URLSearchParams(window.location.search).get("mine") === "1");
  }, []);
  function showMine(v: boolean) {
    setMine(v);
    const url = new URL(window.location.href);
    if (v) url.searchParams.set("mine", "1");
    else url.searchParams.delete("mine");
    window.history.replaceState(null, "", url);
  }

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

  // ponytail: "Yours" filters the loaded pages client-side; add ?sellerId= to the API if sellers list more than a page.
  const items = page ? (mine && session ? page.items.filter((l) => l.sellerId === session.user.id) : page.items) : null;

  return (
    <section data-wide className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Browse</h1>
        {canSell && (
          <Link href="/listings/new" className="btn btn-primary">
            Sell something
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draft.trim());
          }}
          className="flex min-w-0 flex-1 gap-2"
        >
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search listings"
            aria-label="Search listings"
            className="field min-w-0 flex-1"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>
        {session && (
          <div role="group" aria-label="Show" className="seg self-start">
            <button type="button" aria-pressed={!mine} onClick={() => showMine(false)}>
              All listings
            </button>
            <button type="button" aria-pressed={mine} onClick={() => showMine(true)}>
              Yours
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="note note-error flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet shrink-0">
            Try again
          </button>
        </div>
      )}

      {!items && !error && (
        <ul aria-busy className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex flex-col gap-2">
              <div className="skeleton aspect-[4/5] w-full" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-2/5" />
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && (
        <div className="tile items-start">
          <h2 className="section-title">
            {mine ? "You haven't listed anything yet." : q ? `Nothing matches "${q}".` : "No listings yet."}
          </h2>
          <p className="text-muted">
            {mine ? "Write it in your own language. Buyers read it in theirs." : q ? "Try a shorter word." : "Be the first to post something for sale."}
          </p>
          {canSell || !session ? (
            <Link href="/listings/new" className="btn btn-primary">
              Post a listing
            </Link>
          ) : null}
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <li key={l.id} className="min-w-0">
              <ListingCard listing={l} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      {page?.nextCursor && (
        <button type="button" onClick={loadMore} disabled={loadingMore} aria-busy={loadingMore} className="btn btn-secondary self-center">
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}
