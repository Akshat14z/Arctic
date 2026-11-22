"use client";

import { useState, useSyncExternalStore } from "react";
import type { LangCode, Listing } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";
import { translator } from "@/lib/i18n";

const noop = () => () => {};

/** WhatsApp-group launcher (DHRUMIL-T17, D-025): people already trade in groups; one tap posts the listing there. */
export function ShareListing({ listing, lang, mine }: { listing: Listing; lang: LangCode; mine: boolean }) {
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);
  const t = translator(lang);
  if (!origin) return null;

  const url = `${origin}/listings/${encodeURIComponent(listing.id)}`;
  const text = `${listing.title} · ${formatPrice(listing.price, lang)}\nChat with the seller on Handshake. Each of you reads in your own language:`;

  return (
    <section aria-label="Share this listing" className="flex flex-col gap-2">
      <p className="meta">{mine ? t("share.mine") : t("share.ask")}</p>
      <div className="-ms-[var(--space-xs)] flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-quiet"
        >
          {t("share.whatsapp")}
        </a>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: listing.title, text, url }).catch(() => {})}
            className="btn btn-quiet"
          >
            {t("share.more")}
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
          className="btn btn-quiet"
        >
          {copied ? t("share.copied") : t("share.copy")}
        </button>
      </div>
    </section>
  );
}
