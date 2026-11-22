"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatCreateResponseSchema, SellerStorefrontResponseSchema, type SellerStorefrontResponse } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { FollowButton, FollowNotificationControls } from "@/components/follow-button";
import { ListingImage } from "@/components/listing-card";
import { formatPrice } from "@/lib/format";
import { CallButton } from "@/components/call-button";

export function SellerStorefront() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [data, setData] = useState<SellerStorefrontResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api(`/api/sellers/${encodeURIComponent(id)}?limit=24`, { schema: SellerStorefrontResponseSchema }).then(
      (value) => live && setData(value),
      (err) => live && setError(friendlyMessage(err)),
    );
    return () => { live = false; };
  }, [id]);

  if (error) return <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-20 text-center"><h1 className="page-title">Storefront unavailable</h1><p className="text-muted">{error}</p><Link href="/listings" className="btn btn-primary">Browse marketplace</Link></div>;
  if (!data) return <div aria-busy className="flex flex-col gap-5"><div className="skeleton h-56"/><div className="grid grid-cols-2 gap-4 md:grid-cols-3"><div className="skeleton aspect-[4/3]"/><div className="skeleton aspect-[4/3]"/></div></div>;

  const { seller } = data;
  const mine = session?.user.id === seller.id;
  async function message() {
    const first = data?.listings[0];
    if (!first) return;
    if (!session) return router.push(`/signup?next=${encodeURIComponent(`/sellers/${seller.id}`)}`);
    setBusy(true);
    try {
      const chat = await api("/api/chats", { method: "POST", body: { listingId: first.id }, token: session.sessionToken, schema: ChatCreateResponseSchema });
      router.push(`/chats/${encodeURIComponent(chat.channelId)}`);
    } catch { setBusy(false); }
  }

  return (
    <div data-wide className="flex flex-col gap-10">
      <section className="storefront-hero">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface text-2xl font-semibold">
            {seller.avatarUrl ? <img src={seller.avatarUrl} alt="" className="size-full object-cover" /> : seller.displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="page-title break-words">{seller.displayName}</h1>{seller.isVerified && <span className="verified-badge">Verified</span>}</div>
            <p className="mt-2 text-muted">{seller.bio ?? "Independent seller on CommonGrounds."}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!mine && <FollowButton sellerId={seller.id} />}
          {!mine && <button type="button" onClick={message} disabled={busy || data.listings.length === 0} className="btn btn-secondary">{busy ? "Opening…" : "Message seller"}</button>}
          {!mine && session && <CallButton peerId={seller.id} peerName={seller.displayName} myName={session.user.displayName} />}
        </div>
        <dl className="col-span-full grid grid-cols-2 gap-3 border-t border-border pt-5 text-center sm:max-w-2xl sm:grid-cols-4 sm:text-left">
          <div><dt className="meta">Followers</dt><dd className="text-xl font-semibold">{seller.followerCount}</dd></div>
          <div><dt className="meta">Following</dt><dd className="text-xl font-semibold">{seller.followingCount}</dd></div>
          <div><dt className="meta">Listings</dt><dd className="text-xl font-semibold">{seller.activeListingCount}</dd></div>
          <div><dt className="meta">Trust score</dt><dd className="text-xl font-semibold">{seller.trustScore ?? "New"}</dd></div>
        </dl>
        {seller.businessDescription && <p className="col-span-full max-w-3xl text-ink-2">{seller.businessDescription}</p>}
        {!mine && <div className="col-span-full"><FollowNotificationControls sellerId={seller.id} /></div>}
      </section>

      {seller.categories.length > 0 && <div className="flex flex-wrap gap-2">{seller.categories.map((category) => <span key={category} className="category-chip">{category}</span>)}</div>}

      <section className="flex flex-col gap-5"><div><p className="eyebrow">Storefront</p><h2 className="section-title">Available now</h2></div>
        {data.listings.length === 0 ? <div className="empty-state"><h3>No active listings</h3><p>This seller has nothing available right now.</p></div> : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.listings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="market-card group">
              <div className="aspect-[4/3] overflow-hidden bg-surface-2"><ListingImage src={listing.imageUrl} title={listing.title} className="transition-transform motion-safe:group-hover:scale-[1.03]" /></div>
              <div className="flex flex-col gap-1 p-4"><h3 className="break-words">{listing.title}</h3><p className="agate font-semibold">{formatPrice(listing.price, session?.user.language ?? "en")}</p>{listing.category && <p className="meta">{listing.category}</p>}</div>
            </Link>
          ))}</div>
        )}
      </section>
      <section className="flex flex-col gap-4 border-t border-border pt-8"><div><p className="eyebrow">Transaction reputation</p><h2 className="section-title">Genuine reviews</h2></div>{seller.genuineReviewCount === 0 ? <p className="text-muted">No verified transaction reviews yet. Reviews are never invented or imported from unrelated activity.</p> : <p>{seller.genuineReviewCount} verified transaction reviews</p>}</section>
    </div>
  );
}
