"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChatCreateResponseSchema, FollowingFeedResponseSchema, SellerSearchResponseSchema, type FollowingFeedResponse, type SellerSearchResponse } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useRequireSession } from "@/lib/use-require-session";
import { ListingImage } from "@/components/listing-card";
import { formatPrice } from "@/lib/format";
import { WatchlistButton } from "@/components/watchlist-button";
import { FollowButton } from "@/components/follow-button";
import { Icon } from "@/components/icons";

export function FollowingFeed() {
  const session = useRequireSession();
  const [page, setPage] = useState<FollowingFeedResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sellerResults, setSellerResults] = useState<SellerSearchResponse["items"] | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    if (!session || busy) return;
    setBusy(true); setError(null);
    try {
      const next = await api(`/api/following/feed?limit=12&lang=${session.user.language}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token: session.sessionToken, schema: FollowingFeedResponseSchema });
      setPage((current) => cursor && current ? { items: [...current.items, ...next.items], nextCursor: next.nextCursor } : next);
    } catch (err) { setError(friendlyMessage(err)); } finally { setBusy(false); }
  }, [session, busy]);

  useEffect(() => { if (session && !page && !busy) void load(); }, [session, page, busy, load]);

  useEffect(() => {
    const q = query.trim();
    if (!session || !q) {
      setSellerResults(null);
      setSearchError(null);
      setSearchBusy(false);
      return;
    }
    let live = true;
    setSellerResults(null);
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      setSearchError(null);
      try {
        const response = await api(`/api/sellers/search?q=${encodeURIComponent(q)}&limit=10`, {
          token: session.sessionToken,
          schema: SellerSearchResponseSchema,
        });
        if (live) setSellerResults(response.items);
      } catch (err) {
        if (live) setSearchError(friendlyMessage(err));
      } finally {
        if (live) setSearchBusy(false);
      }
    }, 280);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query, session]);

  if (!session) return <div aria-busy className="skeleton h-64" />;

  return (
    <div data-wide className="flex flex-col gap-6">
      <header className="following-head">
        <div><p className="eyebrow">Your network</p><h1 className="page-title">Following</h1><p className="mt-2 text-muted">Fresh listings from sellers you chose to keep up with.</p></div>
        <div className="seller-search-wrap">
          <form role="search" onSubmit={(event) => event.preventDefault()} className="seller-search">
            <Icon name="browse" className="size-5 shrink-0 text-muted" />
            <label htmlFor="seller-search" className="sr-only">Search sellers</label>
            <input id="seller-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sellers" />
            {searchBusy && <span className="seller-search-status" aria-label="Searching" />}
          </form>
          {query.trim() && (
            <div className="seller-results" aria-live="polite">
              {searchError && <p className="note note-error">{searchError}</p>}
              {!searchError && sellerResults?.length === 0 && (
                <div className="p-4"><p className="font-semibold">No matching sellers</p><p className="meta mt-1">Try a shorter name or a product category.</p></div>
              )}
              {!searchError && sellerResults?.map((seller) => (
                <div key={seller.id} className="seller-result-row">
                  <Link href={`/sellers/${seller.id}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-semibold">
                      {seller.avatarUrl ? <img src={seller.avatarUrl} alt="" className="size-full object-cover" /> : seller.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{seller.displayName}{seller.isVerified && <span className="ml-1 text-accent" aria-label="Verified">●</span>}</span>
                      <span className="meta block truncate">{seller.bio || `${seller.activeListingCount} active listings · ${seller.followerCount} followers`}</span>
                    </span>
                  </Link>
                  <FollowButton sellerId={seller.id} compact />
                </div>
              ))}
              {searchBusy && sellerResults === null && <div className="p-3"><div className="skeleton h-12" /></div>}
            </div>
          )}
        </div>
      </header>
      {error && <div className="note note-error"><p>{error}</p><button type="button" onClick={() => void load()} className="btn btn-secondary mt-3">Try again</button></div>}
      {!page && !error && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="skeleton h-72"/><div className="skeleton h-72"/><div className="skeleton h-72"/></div>}
      {page?.items.length === 0 && <div className="empty-state"><h2>Your following feed is ready for its first seller.</h2><p>Open a listing and follow a seller to see their newest products here.</p><Link href="/listings" className="btn btn-primary">Browse marketplace</Link></div>}
      {page && page.items.length > 0 && <div data-stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{page.items.map(({ listing, seller, publishedAt }) => (
        <article key={listing.id} className="market-card following-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border p-3"><Link href={`/sellers/${seller.id}`} className="flex min-w-0 items-center gap-2.5 no-underline"><span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold">{seller.avatarUrl ? <img src={seller.avatarUrl} alt="" className="size-full object-cover"/> : seller.displayName.charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{seller.displayName}{seller.isVerified ? " · Verified" : ""}</span><time className="meta text-xs" dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</time></span></Link></div>
          <Link href={`/listings/${listing.id}`} className="block aspect-[16/9] overflow-hidden bg-surface-2"><ListingImage src={listing.imageUrl} title={listing.title} /></Link>
          <div className="flex flex-col gap-3 p-3"><div className="flex items-start justify-between gap-3"><h2 className="line-clamp-2 text-base font-semibold break-words">{listing.title}</h2><p className="agate shrink-0 font-semibold">{formatPrice(listing.price, session.user.language)}</p></div><div className="flex flex-wrap gap-2"><Link href={`/listings/${listing.id}`} className="btn btn-primary min-w-0 flex-1 px-4 text-sm">View</Link><Message listingId={listing.id} token={session.sessionToken} /><WatchlistButton listingId={listing.id} compact /></div></div>
        </article>
      ))}</div>}
      {page?.nextCursor && <button type="button" onClick={() => void load(page.nextCursor)} disabled={busy} className="btn btn-secondary self-center">{busy ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

function Message({ listingId, token }: { listingId: string; token: string }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const chat = await api("/api/chats", { method: "POST", body: { listingId }, token, schema: ChatCreateResponseSchema });
      window.location.assign(`/chats/${encodeURIComponent(chat.channelId)}`);
    } catch { setBusy(false); }
  }
  return <button type="button" onClick={open} disabled={busy} className="btn btn-secondary min-w-0 flex-1 px-4 text-sm">{busy ? "Opening…" : "Message"}</button>;
}
