"use client";

import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

/** A small pill badge. */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-text shadow-xs backdrop-blur-sm border border-border">
      <span className="size-1.5 rounded-full bg-accent" />
      Demo
    </span>
  );
}

/** One listing in the Browse grid: clear visual hierarchy with image, title, snippet, price, seller and action. */
export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-3 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg no-underline text-text"
    >
      <div>
        {/* 1. Product Image / Aspect Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/80 bg-surface-2">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.imageUrl}
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            />
          ) : (
            <div aria-hidden className="grid size-full place-items-center bg-gradient-to-br from-surface-2 to-[var(--color-rule)] font-display text-5xl text-muted/60">
              {listing.title.trim().charAt(0).toUpperCase()}
            </div>
          )}

          {listing.isDemo && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <DemoBadge />
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5 z-10">
            <span className="agate rounded-lg bg-black/75 px-2 py-0.5 text-xs font-bold text-white shadow-xs backdrop-blur-xs">
              {formatPrice(listing.price, lang)}
            </span>
          </div>
        </div>

        {/* 2. Product Title & Short Description */}
        <div className="mt-3 flex flex-col gap-1">
          <h3
            lang={listing.lang}
            className="line-clamp-1 text-sm font-semibold text-text group-hover:text-accent transition-colors"
          >
            {listing.title}
          </h3>

          {listing.description && (
            <p className="line-clamp-2 text-xs text-muted leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>
      </div>

      {/* 3. Footer: Seller Info & Quick Action */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
            {listing.seller ? listing.seller.displayName.charAt(0).toUpperCase() : "S"}
          </span>
          <span className="meta truncate text-xs font-medium">
            {listing.seller?.displayName ?? "Seller"}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text group-hover:bg-accent group-hover:text-[var(--color-accent-ink)] transition-colors">
          Chat & Offer →
        </span>
      </div>
    </Link>
  );
}
