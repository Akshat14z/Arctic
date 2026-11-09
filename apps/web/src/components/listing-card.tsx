import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

/** A small grey pill. */
export function DemoBadge() {
  return (
    <span className="inline-block shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs leading-tight font-medium text-muted">
      Demo
    </span>
  );
}

/** One listing row: photo (or initial) tile, title over seller, price on the right (the reference's list row). */
export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link href={`/listings/${listing.id}`} className="row py-3">
      <span className="row-icon size-14" aria-hidden>
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs; next/image needs a host allowlist
          <img src={listing.imageUrl} alt="" loading="lazy" />
        ) : (
          listing.title.trim().charAt(0).toUpperCase()
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span lang={listing.lang} className="row-title">
          {listing.title}
        </span>
        <span className="flex items-center gap-2">
          {listing.seller && <span className="meta truncate">{listing.seller.displayName}</span>}
          {listing.isDemo && <DemoBadge />}
        </span>
      </span>
      <span className="agate shrink-0 text-right font-medium">{formatPrice(listing.price, lang)}</span>
    </Link>
  );
}
