"use client";

import { useState } from "react";
import type { Deal, LangCode } from "@convocart/contracts";
import Link from "next/link";
import { formatPrice, localeFor } from "@/lib/format";
import { SealQr, useSealUrl } from "./seal-qr";

export type DealRole = "buyer" | "seller";

const pick = <T,>(r: Partial<Record<LangCode, T>>, lang: LangCode) => r[lang] ?? r.en ?? Object.values(r)[0];

/** Plain-text body for clients that can't render the card (C4 fallback). */
export function dealSummary(deal: Deal, lang: LangCode): string {
  const state = deal.status === "agreed" ? "agreed by both" : "proposed";
  return `Deal: ${pick(deal.item, lang)} · ${formatPrice(deal.price, lang)} · ${state}`;
}

type Props = {
  deal: Deal;
  lang: LangCode;
  myRole?: DealRole; // undefined for agents: read-only
  names: Record<DealRole, string>;
  onAgree?: (deal: Deal) => Promise<void>;
};

/** Deal Card (C5): the same terms on both screens, each in its reader's language. */
export function DealCard({ deal, lang, myRole, names, onAgree }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const agreed = deal.status === "agreed";
  const when = (iso: string) =>
    new Date(iso).toLocaleString(localeFor(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const canAgree = myRole && onAgree && !agreed && !deal.agreedBy[myRole];
  const conditions = pick(deal.conditions, lang) ?? [];

  async function agree() {
    if (!onAgree || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onAgree(deal);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article aria-label="Deal" className="tile w-full gap-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="item-title">Deal</h3>
        <p className={`meta ${agreed ? "text-success" : ""}`}>{agreed ? "Agreed by both" : "Waiting for agreement"}</p>
      </div>

      <div className="flex flex-col gap-1 pt-3 pb-4">
        <p lang={lang}>{pick(deal.item, lang)}</p>
        <p className="agate text-3xl leading-tight">
          {formatPrice(deal.price, lang)}
          {deal.quantity > 1 && <span className="text-base text-muted"> × {deal.quantity}</span>}
        </p>
        {deal.delivery && (
          <p className="meta">
            {deal.delivery.method === "pickup" ? "Pickup" : "Shipping"}
            {deal.delivery.date && <span className="agate">, {deal.delivery.date}</span>}
          </p>
        )}
      </div>

      <details open={!agreed} className="group">
        <summary className="meta flex min-h-tap cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
          <span className="transition-transform group-open:rotate-90" aria-hidden>›</span> Terms and who agreed
        </summary>
      {conditions.length > 0 && (
        <ul lang={lang} className="border-t border-border text-sm">
          {conditions.map((c) => (
            <li key={c} className="border-b border-border py-2">
              {c}
            </li>
          ))}
        </ul>
      )}

      <ul className={`text-sm ${conditions.length > 0 ? "mt-3 border-t border-border" : "border-t border-border"}`}>
        {(["buyer", "seller"] as const).map((r) => (
          <li key={r} className="flex items-baseline justify-between gap-3 border-b border-border py-2">
            <span className="min-w-0">
              {names[r]} {r === myRole && <span className="text-muted">(you)</span>}
            </span>
            <span className={`agate shrink-0 ${deal.agreedBy[r] ? "text-success" : "text-muted"}`}>
              {deal.agreedBy[r] ? `✓ ${when(deal.agreedBy[r]!)}` : "not yet"}
            </span>
          </li>
        ))}
      </ul>
      </details>

      {canAgree && (
        <button type="button" onClick={agree} disabled={busy} aria-busy={busy} className="btn btn-primary mt-4 w-full">
          {busy ? "Agreeing…" : "Agree to these terms"}
        </button>
      )}
      {failed && (
        <p role="alert" className="note note-error mt-3">
          Couldn&apos;t record your agreement. Try again.
        </p>
      )}
      {agreed && deal.sealCode && <SealBlock code={deal.sealCode} />}
    </article>
  );
}

/** Handshake Seal (DHRUMIL-T15, D-023): show the QR at pickup; scanning it opens the verified deal. */
function SealBlock({ code }: { code: string }) {
  const url = useSealUrl(code);
  return (
    <div className="note note-success mt-4 flex items-start gap-3">
      <SealQr url={url} size={96} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">Handshake Seal</p>
        <p>Both sides agreed to exactly this. Show the code at pickup: scanning it opens the verified deal.</p>
        <Link href={`/seal/${encodeURIComponent(code)}`} className="link inline-flex min-h-tap flex-wrap items-center gap-x-1 break-all">
          Open the seal <span className="agate">{code}</span>
        </Link>
      </div>
    </div>
  );
}
