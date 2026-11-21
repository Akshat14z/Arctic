"use client";

import { useState } from "react";
import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

/** Marks seeded demo data (D-015). */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text">
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      Demo
    </span>
  );
}

/** Listing photo, or the title's first letter when there is none or it fails to load. */
export function ListingImage({ src, title, className = "" }: { src?: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`size-full object-cover ${className}`} />
    );
  return (
    <div aria-hidden className="grid size-full place-items-center bg-surface-2 font-display text-5xl text-muted">
      {title.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

/** One listing in a grid: photo, full title, price, seller. The whole card is the link. */
export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link href={`/listings/${listing.id}`} className="group flex min-w-0 flex-col gap-3 text-text no-underline">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-2">
        <ListingImage src={listing.imageUrl} title={listing.title} className="transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]" />
        {listing.isDemo && (
          <span className="absolute top-2 left-2">
            <DemoBadge />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 lang={listing.lang} className="text-sm font-semibold break-words group-hover:underline">
          {listing.title}
        </h3>
        <p className="agate text-base font-semibold">{formatPrice(listing.price, lang)}</p>
        <p className="meta text-xs break-words">{listing.seller?.displayName ?? "Seller"}</p>
      </div>
    </Link>
  );
}
