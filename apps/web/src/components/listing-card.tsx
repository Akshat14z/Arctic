import Link from "next/link";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

export function DemoBadge() {
  return <span className="rounded-full bg-guard-bg px-2 py-0.5 text-xs font-medium text-guard">Demo</span>;
}

export function ListingCard({ listing, lang }: { listing: Listing; lang: LangCode }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex gap-3 rounded-xl border border-border bg-surface p-3 hover:border-brand"
    >
      {listing.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs; next/image needs a host allowlist
        <img src={listing.imageUrl} alt="" loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div aria-hidden className="size-20 shrink-0 rounded-lg bg-bg" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start gap-2">
          <h2 lang={listing.lang} className="line-clamp-2 font-medium">
            {listing.title}
          </h2>
          {listing.isDemo && <DemoBadge />}
        </div>
        <p className="font-semibold">{formatPrice(listing.price, lang)}</p>
        {listing.seller && <p className="truncate text-sm text-muted">{listing.seller.displayName}</p>}
      </div>
    </Link>
  );
}
