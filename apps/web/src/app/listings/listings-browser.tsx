"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingListResponseSchema, type Listing } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";

type Page = { items: Listing[]; nextCursor?: string };
type SortOption = "newest" | "price-asc" | "price-desc";

/** Browse: search, mine/all, sort, photo grid. */
export function ListingsBrowser() {
  const session = useSession();
  const hydrated = session !== undefined;
  const lang = session?.user.language ?? "en";
  const canSell = !!session && session.user.role !== "agent";
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // "My listings" (account menu) links here with ?mine=1.
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
    if (!hydrated) return;
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

  // Filter items by Mine and Category
  let items = page ? (mine && session ? page.items.filter((l) => l.sellerId === session.user.id) : page.items) : null;

  // Sort items
  if (items) {
    items = [...items].sort((a, b) => {
      if (sortBy === "price-asc") return a.price.amount - b.price.amount;
      if (sortBy === "price-desc") return b.price.amount - a.price.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  return (
    <section data-wide className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Browse</h1>
          <p className="text-muted">Every listing reads in your language. Chat with the seller in yours.</p>
        </div>
        {canSell && (
          <Link href="/listings/new" className="btn btn-primary">
            Sell something
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draft.trim());
          }}
          className="flex min-w-[min(100%,18rem)] flex-1 gap-2"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search listings</span>
            <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
            <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search listings" className="field pl-10" />
          </label>
          <button type="submit" className="btn btn-secondary shrink-0">
            Search
          </button>
        </form>
        {session && (
          <div role="group" aria-label="Show" className="seg">
            <button type="button" aria-pressed={!mine} onClick={() => showMine(false)}>
              All
            </button>
            <button type="button" aria-pressed={mine} onClick={() => showMine(true)}>
              Mine
            </button>
          </div>
        )}
        <label className="flex items-center gap-2">
          <span className="meta">Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="field w-auto cursor-pointer">
            <option value="newest">Newest</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
      </div>

      {items && q && (
        <p className="meta flex flex-wrap items-center gap-x-3">
          {items.length} {items.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
          <button
            type="button"
            onClick={() => {
              setDraft("");
              setQ("");
            }}
            className="hit link"
          >
            Clear search
          </button>
        </p>
      )}

      {/* Errors */}
      {error && (
        <div role="alert" className="note note-error flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet shrink-0">
            Try again
          </button>
        </div>
      )}

      {/* Skeletons Loading State */}
      {!items && !error && (
        <ul aria-busy className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <li key={i} className="flex flex-col gap-2">
              <div className="skeleton aspect-[4/3] w-full rounded-xl" />
              <div className="skeleton mt-1 h-4 w-4/5" />
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton h-3 w-3/5" />
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-col items-start gap-3 border-y border-border py-10">
          <h2 className="text-lg font-semibold">{mine ? "You haven't listed anything yet" : q ? `Nothing matches “${q}”` : "No listings yet"}</h2>
          <p className="text-muted">{mine ? "Post an item and buyers can make offers in their own language." : q ? "Try a shorter word, or clear the search." : "Be the first to sell something."}</p>
          {canSell && (
            <Link href="/listings/new" className="btn btn-primary">
              Sell something
            </Link>
          )}
        </div>
      )}

      {/* Products Grid */}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <li key={l.id} className="min-w-0">
              <ListingCard listing={l} lang={lang} />
            </li>
          ))}
        </ul>
      )}

      {/* Load More Action */}
      {page?.nextCursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          aria-busy={loadingMore}
          className="btn btn-secondary self-center px-6 mt-4 font-medium"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </section>
  );
}
