"use client";

import { useState, useSyncExternalStore } from "react";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";

const noop = () => () => {};

/** WhatsApp-group launcher (DHRUMIL-T17, D-025): people already trade in groups; one tap posts the listing there. */
export function ShareListing({ listing, lang, mine }: { listing: Listing; lang: LangCode; mine: boolean }) {
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);
  if (!origin) return null;

  const url = `${origin}/listings/${encodeURIComponent(listing.id)}`;
  const text = `${listing.title} · ${formatPrice(listing.price, lang)}\nChat with the seller on Handshake. Each of you reads in your own language:`;

  return (
    <section aria-label="Share this listing" className="flex flex-col gap-2">
      <p className="text-sm text-muted">{mine ? "Post it to your WhatsApp groups. Buyers open it in their own language." : "Know someone who wants this?"}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-tap items-center rounded-lg border border-border px-4 font-medium"
        >
          Share on WhatsApp
        </a>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: listing.title, text, url }).catch(() => {})}
            className="min-h-tap rounded-lg border border-border px-4 font-medium"
          >
            Share…
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {}
          }}
          className="min-h-tap rounded-lg border border-border px-4 font-medium"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
