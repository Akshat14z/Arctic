"use client";

import { useEffect, useState } from "react";
import type { Deal, LangCode } from "@convocart/contracts";
import Link from "next/link";
import { formatPrice, localeFor } from "@/lib/format";
import { SealQr, useSealUrl } from "./seal-qr";
import { SealDetailResponseSchema } from "@convocart/contracts";
import { api } from "@/lib/api/client";

export type DealRole = "buyer" | "seller";

const pick = <T,>(r: Partial<Record<LangCode, T>>, lang: LangCode) => r[lang] ?? r.en ?? Object.values(r)[0];

/** Plain-text body for clients that can't render the card (C4 fallback). */
export function dealSummary(deal: Deal, lang: LangCode): string {
  const state =
    deal.status === "agreed"
      ? "agreed by both"
      : deal.status === "rejected"
      ? "declined"
      : "proposed";
  return `Offer: ${pick(deal.item, lang)} · ${formatPrice(deal.price, lang)} · ${state}`;
}

type Props = {
  deal: Deal;
  lang: LangCode;
  myRole?: DealRole; // undefined for agents: read-only
  names: Record<DealRole, string>;
  onAgree?: (deal: Deal) => Promise<void>;
  onReject?: (deal: Deal) => Promise<void>;
  onCounter?: (deal: Deal) => void;
};

/** Deal Card (C5): the same terms on both screens, each in its reader's language. */
export function DealCard({ deal, lang, myRole, names, onAgree, onReject, onCounter }: Props) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const agreed = deal.status === "agreed";
  const rejected = deal.status === "rejected";
  const pending = deal.status === "proposed";

  const when = (iso: string) =>
    new Date(iso).toLocaleString(localeFor(lang), {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  // Did the current user propose this offer?
  const isCreator = myRole && deal.offeredBy === myRole;
  // Can current user agree / accept? (recipient who hasn't agreed yet)
  const canAgree = myRole && onAgree && pending && !deal.agreedBy[myRole];
  // Can current user reject / decline?
  const canReject = myRole && onReject && pending && !deal.agreedBy[myRole];
  // Can current user counter-offer?
  const canCounter = myRole && onCounter && pending;

  const conditions = pick(deal.conditions, lang) ?? [];

  async function handleAgree() {
    if (!onAgree || busy || rejecting) return;
    setBusy(true);
    setFailed(null);
    try {
      await onAgree(deal);
    } catch {
      setFailed("Couldn't record agreement. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!onReject || busy || rejecting) return;
    setRejecting(true);
    setFailed(null);
    try {
      await onReject(deal);
    } catch {
      setFailed("Couldn't decline offer. Please try again.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <article
      aria-label="Structured Offer Card"
      className={`tile w-full gap-0 overflow-hidden border transition-all ${
        agreed
          ? "border-emerald-500/40 bg-emerald-500/[0.03] shadow-sm"
          : rejected
          ? "border-red-500/30 bg-red-500/[0.02] opacity-80"
          : "border-accent/40 bg-surface shadow-md"
      }`}
    >
      {/* Top Header & Status Badge */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-accent/15 text-accent text-sm font-semibold">
            🤝
          </span>
          <div>
            <h3 className="item-title text-base font-semibold leading-tight">
              {deal.offeredByName ? `Offer from ${deal.offeredByName}` : "Official Offer"}
            </h3>
            <span className="meta text-xs">
              {isCreator ? "You created this offer" : `Sent to ${myRole ? names[myRole] : "recipient"}`}
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {agreed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
              ✓ Agreed & Sealed
            </span>
          ) : rejected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-700">
              ✕ Offer Declined
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-800">
              ⏳ Pending Confirmation
            </span>
          )}
        </div>
      </div>

      {/* Offer Body: Item & Amount */}
      <div className="flex flex-col gap-2 py-4">
        <p lang={lang} className="text-sm font-medium text-muted">
          {pick(deal.item, lang)}
        </p>
        <div className="flex items-baseline justify-between">
          <p className="agate text-3xl font-extrabold tracking-tight text-text">
            {formatPrice(deal.price, lang)}
            {deal.quantity > 1 && <span className="text-base text-muted font-normal"> × {deal.quantity}</span>}
          </p>
          {deal.delivery && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted rounded-md bg-surface-2 px-2.5 py-1">
              {deal.delivery.method === "pickup" ? "🤝 In-Person Pickup" : "📦 Courier Delivery"}
              {deal.delivery.date && <span className="agate">({deal.delivery.date})</span>}
            </span>
          )}
        </div>

        {/* Optional offer message from sender */}
        {deal.offerMessage && (
          <div className="mt-1 rounded-lg border border-border/80 bg-surface-2 p-2.5 text-xs text-text italic">
            &ldquo;{deal.offerMessage}&rdquo;
          </div>
        )}
      </div>

      {/* Collapsible Terms & Agreement Timeline */}
      <details open={pending} className="group border-t border-border pt-2 pb-1">
        <summary className="meta flex min-h-tap cursor-pointer list-none items-center justify-between text-xs font-medium text-muted hover:text-text [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90" aria-hidden>›</span>
            <span>Terms & Mutual Verification</span>
          </span>
          <span className="text-[11px] opacity-70">
            {deal.agreedBy.buyer && deal.agreedBy.seller
              ? "Both signed"
              : deal.agreedBy.buyer || deal.agreedBy.seller
              ? "1 of 2 signed"
              : "Unsigned"}
          </span>
        </summary>

        {conditions.length > 0 && (
          <ul lang={lang} className="mt-2 rounded-lg bg-surface-2 p-2.5 text-xs">
            {conditions.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5 py-0.5 text-muted">
                <span className="text-accent">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-2 text-xs divide-y divide-border">
          {(["buyer", "seller"] as const).map((r) => (
            <li key={r} className="flex items-center justify-between py-1.5">
              <span className="text-text">
                {names[r]} {r === myRole && <span className="text-muted">(you)</span>}
              </span>
              <span className={`agate font-medium ${deal.agreedBy[r] ? "text-emerald-600" : "text-muted"}`}>
                {deal.agreedBy[r] ? `✓ Accepted ${when(deal.agreedBy[r]!)}` : "Awaiting response"}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {/* Action Buttons */}
      {canAgree && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleAgree}
            disabled={busy || rejecting}
            aria-busy={busy}
            className="btn btn-primary flex-1 font-semibold shadow-sm"
          >
            {busy ? "Accepting Deal…" : "✓ Accept Offer"}
          </button>

          {canCounter && (
            <button
              type="button"
              onClick={() => onCounter(deal)}
              disabled={busy || rejecting}
              className="btn btn-secondary px-4 font-medium"
            >
              Counter
            </button>
          )}

          {canReject && (
            <button
              type="button"
              onClick={handleReject}
              disabled={busy || rejecting}
              aria-busy={rejecting}
              className="btn btn-quiet text-danger px-3 text-sm hover:bg-danger/10"
            >
              {rejecting ? "Declining…" : "Decline"}
            </button>
          )}
        </div>
      )}

      {isCreator && pending && (
        <div className="mt-3 rounded-lg bg-surface-2 p-2.5 text-center text-xs text-muted">
          Your offer has been submitted. Waiting for recipient to accept or counter.
        </div>
      )}

      {failed && (
        <p role="alert" className="note note-error mt-2 text-xs">
          {failed}
        </p>
      )}

      {/* Handshake Seal Block for Agreed Deals */}
      {agreed && deal.sealCode && <SealBlock code={deal.sealCode} />}
    </article>
  );
}

/** Handshake Seal: show the QR at pickup; scanning it opens the verified deal. */
function SealBlock({ code }: { code: string }) {
  const proof = useSealProof(code);
  const url = useSealUrl(code, proof);
  return (
    <div className="note note-success mt-3 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
      <SealQr url={url} size={108} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
        <p className="font-semibold text-sm text-emerald-900">Handshake Seal Active</p>
        <p className="text-emerald-800">
          Both sides agreed to these terms. Present this code at pickup or delivery to inspect and confirm handover.
        </p>
        <Link
          href={`/seal/${encodeURIComponent(code)}${proof ? `#p=${proof}` : ""}`}
          className="link font-semibold underline text-emerald-700 mt-1 inline-flex items-center gap-1"
        >
          Verify Certificate: <span className="agate font-mono font-bold">{code}</span> ↗
        </Link>
      </div>
    </div>
  );
}

function useSealProof(code: string): string | undefined {
  const [proof, setProof] = useState<string>();
  useEffect(() => {
    let live = true;
    api(`/api/seals/${encodeURIComponent(code)}`, { schema: SealDetailResponseSchema }).then(
      (s) => live && setProof(s.proof),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [code]);
  return proof;
}
