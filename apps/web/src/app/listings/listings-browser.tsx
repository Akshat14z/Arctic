"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListingListResponseSchema, type Listing } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { ListingCard } from "@/components/listing-card";

type Page = { items: Listing[]; nextCursor?: string };
type SortOption = "newest" | "price-asc" | "price-desc";

const CATEGORIES = [
  "All",
  "Watches & Accessories",
  "Electronics",
  "Collectibles & Art",
  "Home & Living",
  "Vehicles",
];

/** Browse: search, category chips, sorting, and responsive photo grid. */
export function ListingsBrowser() {
  const session = useSession();
  const hydrated = session !== undefined;
  const lang = session?.user.language ?? "en";
  const canSell = !!session && session.user.role !== "agent";
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
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

  if (items && activeCategory !== "All") {
    const catLower = activeCategory.toLowerCase();
    items = items.filter((item) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      if (catLower.includes("watch") && (text.includes("watch") || text.includes("timepiece") || text.includes("seiko") || text.includes("casio"))) return true;
      if (catLower.includes("electronic") && (text.includes("camera") || text.includes("lens") || text.includes("phone") || text.includes("headphone") || text.includes("macbook") || text.includes("tech"))) return true;
      if (catLower.includes("collectible") && (text.includes("art") || text.includes("vintage") || text.includes("antique") || text.includes("rare"))) return true;
      return text.includes(catLower);
    });
  }

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
      {/* Top Header & Sell Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="page-title text-3xl font-bold tracking-tight text-text">Marketplace</h1>
          <p className="meta text-xs sm:text-sm">
            Browse verified listings from sellers across India and Japan. Trade in your own language.
          </p>
        </div>
        {canSell && (
          <Link href="/listings/new" className="btn btn-primary px-5 font-semibold shadow-xs">
            + Post a Listing
          </Link>
        )}
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(draft.trim());
            }}
            className="flex min-w-0 flex-1 gap-2"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">
                🔍
              </span>
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search watches, electronics, collectibles…"
                aria-label="Search listings"
                className="field pl-9"
              />
            </div>
            <button type="submit" className="btn btn-primary shrink-0 px-4">
              Search
            </button>
            {q && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setQ("");
                }}
                className="btn btn-secondary shrink-0 text-xs"
              >
                Clear
              </button>
            )}
          </form>

          {/* All vs Yours Switch */}
          {session && (
            <div role="group" aria-label="Show" className="seg self-start sm:self-center">
              <button type="button" aria-pressed={!mine} onClick={() => showMine(false)}>
                All Listings
              </button>
              <button type="button" aria-pressed={mine} onClick={() => showMine(true)}>
                My Listings
              </button>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="meta text-xs hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="field h-11 py-1 text-xs font-medium cursor-pointer"
              aria-label="Sort listings"
            >
              <option value="newest">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-accent text-[var(--color-accent-ink)] font-semibold shadow-xs"
                    : "bg-surface-2 text-muted hover:bg-[var(--color-rule)] hover:text-text"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Count Banner */}
      {items && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Showing <strong>{items.length}</strong> {items.length === 1 ? "listing" : "listings"}
            {q && <> matching &ldquo;<strong>{q}</strong>&rdquo;</>}
            {activeCategory !== "All" && <> in <strong>{activeCategory}</strong></>}
          </span>
          <span className="agate">Protected by Handshake Seal</span>
        </div>
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
        <ul aria-busy className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <li key={i} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
              <div className="skeleton aspect-[4/3] w-full rounded-xl" />
              <div className="skeleton h-4 w-4/5 mt-2" />
              <div className="skeleton h-3 w-3/5" />
              <div className="skeleton h-5 w-2/5 mt-2" />
            </li>
          ))}
        </ul>
      )}

      {/* Empty State */}
      {items && items.length === 0 && (
        <div className="tile items-center text-center py-12 gap-3">
          <span className="text-4xl">📦</span>
          <h2 className="section-title text-lg font-semibold">
            {mine
              ? "You haven't listed anything yet."
              : q
              ? `No listings found matching "${q}".`
              : activeCategory !== "All"
              ? `No items found in "${activeCategory}".`
              : "No listings available right now."}
          </h2>
          <p className="meta text-xs max-w-md">
            {mine
              ? "Post your first item. Buyers from anywhere can negotiate in their own language."
              : "Try adjusting your search keywords, clear category filters, or explore all items."}
          </p>
          <div className="flex gap-2 mt-2">
            {(q || activeCategory !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setQ("");
                  setActiveCategory("All");
                }}
                className="btn btn-secondary text-xs"
              >
                Reset Filters
              </button>
            )}
            {canSell && (
              <Link href="/listings/new" className="btn btn-primary text-xs">
                Post a Listing
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          {loadingMore ? "Loading more listings…" : "Show More Listings"}
        </button>
      )}
    </section>
  );
}
