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
    <article
      aria-label="Deal"
      className={`flex w-full max-w-sm flex-col gap-3 self-center rounded-2xl border-2 bg-surface p-4 ${agreed ? "border-success" : "border-brand"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Deal</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${agreed ? "bg-success-bg text-success" : "bg-guard-bg text-guard"}`}>
          {agreed ? "Agreed by both" : "Waiting for agreement"}
        </span>
      </div>

      <div>
        <p lang={lang}>{pick(deal.item, lang)}</p>
        <p className="text-2xl font-semibold">
          {formatPrice(deal.price, lang)}
          {deal.quantity > 1 && <span className="text-base font-normal text-muted"> × {deal.quantity}</span>}
        </p>
        {deal.delivery && (
          <p className="text-sm text-muted">
            {deal.delivery.method === "pickup" ? "Pickup" : "Shipping"}
            {deal.delivery.date && ` · ${deal.delivery.date}`}
          </p>
        )}
        {conditions.length > 0 && (
          <ul lang={lang} className="mt-2 list-disc pl-5 text-sm">
            {conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {(["buyer", "seller"] as const).map((r) => (
          <li key={r} className="flex justify-between gap-2">
            <span>
              {names[r]} {r === myRole && <span className="text-muted">(you)</span>}
            </span>
            <span className={deal.agreedBy[r] ? "text-success" : "text-muted"}>
              {deal.agreedBy[r] ? `✓ ${when(deal.agreedBy[r]!)}` : "not yet"}
            </span>
          </li>
        ))}
      </ul>

      {canAgree && (
        <button type="button" onClick={agree} disabled={busy} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50">
          {busy ? "Agreeing…" : "Agree to these terms"}
        </button>
      )}
      {failed && (
        <p role="alert" className="text-sm text-danger">
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
    <div className="flex items-center gap-3 rounded-lg bg-success-bg p-3 text-sm text-success">
      <SealQr url={url} size={96} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">Handshake Seal</p>
        <p>Both sides agreed to exactly this. Show the code at pickup: scanning it opens the verified deal.</p>
        <Link href={`/seal/${encodeURIComponent(code)}`} className="min-h-6 font-medium underline underline-offset-2">
          Open the seal <span className="font-mono">{code}</span>
        </Link>
      </div>
    </div>
  );
}
