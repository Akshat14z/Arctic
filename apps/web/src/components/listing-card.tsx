import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

/** A small ruled label, not a pill. */
export function DemoBadge() {
  return (
    <span className="inline-block shrink-0 border border-border px-1.5 py-px text-xs leading-tight font-medium text-muted">
      Demo
    </span>
  );
}

/** One classified line: photo, title, description line, seller; price in agate on the right. */
export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex gap-3 py-4 text-text no-underline transition-colors hover:bg-surface"
    >
      {listing.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs; next/image needs a host allowlist
        <img src={listing.imageUrl} alt="" loading="lazy" className="size-16 shrink-0 border border-border object-cover sm:size-20" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 lang={listing.lang} className="item-title line-clamp-2">
            {listing.title}
          </h2>
          <p className="agate shrink-0 text-right">{formatPrice(listing.price, lang)}</p>
        </div>
        <p lang={listing.lang} className="line-clamp-1 text-muted">
          {listing.description}
        </p>
        <div className="flex items-center gap-2">
          {listing.seller && <p className="meta truncate">{listing.seller.displayName}</p>}
          {listing.isDemo && <DemoBadge />}
        </div>
      </div>
    </Link>
  );
}
