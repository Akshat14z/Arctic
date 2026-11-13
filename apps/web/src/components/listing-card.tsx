import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

/** A small grey pill. */
export function DemoBadge() {
  return (
    <span className="inline-block shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs leading-tight font-medium text-text shadow-[0_0_0_1px_var(--color-rule)]">
      Demo
    </span>
  );
}

/** One listing in the Browse grid: a 4:5 photo (or a lettered tile), the full title, the price and who sells it. */
export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link href={`/listings/${listing.id}`} className="group flex flex-col gap-2 text-text no-underline">
      <span className="relative block aspect-[4/5] overflow-clip rounded-[var(--radius-card)] border border-border bg-surface">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs; next/image needs a host allowlist
          <img
            src={listing.imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <span aria-hidden className="grid size-full place-items-center font-display text-6xl text-[var(--color-faint)]">
            {listing.title.trim().charAt(0).toUpperCase()}
          </span>
        )}
        {listing.isDemo && (
          <span className="absolute top-2 left-2">
            <DemoBadge />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-0.5 px-0.5">
        <span className="agate text-base font-semibold">{formatPrice(listing.price, lang)}</span>
        <span lang={listing.lang} className="text-sm leading-snug font-medium break-words group-hover:underline group-hover:underline-offset-2">
          {listing.title}
        </span>
        {listing.seller && <span className="meta break-words">{listing.seller.displayName}</span>}
      </span>
    </Link>
  );
}
