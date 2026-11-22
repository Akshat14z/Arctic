"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WatchlistResponseSchema, type WatchlistResponse } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useRequireSession } from "@/lib/use-require-session";
import { ListingImage } from "@/components/listing-card";
import { WatchlistButton } from "@/components/watchlist-button";
import { formatPrice } from "@/lib/format";

export function WatchlistView() {
  const session = useRequireSession(); const [data, setData] = useState<WatchlistResponse | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!session) return; try { setData(await api('/api/watchlist?limit=30', { token: session.sessionToken, schema: WatchlistResponseSchema })); } catch (err) { setError(friendlyMessage(err)); } }, [session]);
  useEffect(() => { void load(); }, [load]);
  if (!session) return <div aria-busy className="skeleton h-64"/>;
  return <div data-wide className="flex flex-col gap-7"><header className="border-b border-border pb-5"><p className="eyebrow">Smart Watchlist</p><h1 className="page-title">Saved listings</h1><p className="mt-2 text-muted">Products you saved, separate from the sellers you follow.</p></header>{error && <p className="note note-error">{error}</p>}{!data && !error && <div className="skeleton h-72"/>}{data?.items.length === 0 && <div className="empty-state"><h2>Nothing saved yet</h2><p>Save a listing to compare it later and receive price-change alerts.</p><Link href="/listings" className="btn btn-primary">Browse marketplace</Link></div>}{data && data.items.length > 0 && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((listing) => <article key={listing.id} className="market-card"><Link href={`/listings/${listing.id}`} className="block aspect-[4/3] overflow-hidden bg-surface-2"><ListingImage src={listing.imageUrl} title={listing.title}/></Link><div className="flex flex-col gap-3 p-4"><div><Link href={`/listings/${listing.id}`} className="font-semibold no-underline hover:underline">{listing.title}</Link><p className="agate text-lg font-semibold">{formatPrice(listing.price, session.user.language)}</p><Link href={`/sellers/${listing.seller.id}`} className="meta hover:underline">{listing.seller.displayName}</Link></div><WatchlistButton listingId={listing.id} compact/></div></article>)}</div>}</div>;
}
