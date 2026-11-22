"use client";

import { useEffect, useState } from "react";
import type { Deal, LangCode } from "@convocart/contracts";
import Link from "next/link";
import { formatPrice, localeFor } from "@/lib/format";
import { SealQr, useSealUrl } from "./seal-qr";
import { SealDetailResponseSchema } from "@convocart/contracts";
import { api } from "@/lib/api/client";
import { translator } from "@/lib/i18n";

type T = ReturnType<typeof translator>;

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
  const t = translator(lang);

  async function handleAgree() {
    if (!onAgree || busy || rejecting) return;
    setBusy(true);
    setFailed(null);
    try {
      await onAgree(deal);
    } catch {
      setFailed(t("deal.agreeFailed"));
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
      setFailed(t("deal.declineFailed"));
    } finally {
      setRejecting(false);
    }
  }

  const other: DealRole | undefined = deal.offeredBy === "buyer" ? "seller" : deal.offeredBy === "seller" ? "buyer" : undefined;
  const otherName = other ? names[other] : t("deal.otherSide");
  const fromLine = isCreator
    ? t("deal.youSent", { name: otherName })
    : deal.offeredBy && myRole
    ? t("deal.sentYou", { name: names[deal.offeredBy] })
    : deal.offeredBy && other
    ? t("deal.offeredTo", { a: names[deal.offeredBy], b: names[other] })
    : null;
  const signed = (deal.agreedBy.buyer ? 1 : 0) + (deal.agreedBy.seller ? 1 : 0);

  return (
    <article
      aria-label="Offer"
      className={`tile w-full gap-0 ${agreed ? "border-success" : rejected ? "opacity-80" : "border-accent"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-base font-semibold break-words">{agreed ? t("deal.deal") : deal.offeredByName ? t("deal.offerFrom", { name: deal.offeredByName }) : t("deal.offer")}</h3>
          {fromLine && <p className="meta break-words">{fromLine}</p>}
        </div>
        <StatusPill status={deal.status} t={t} />
      </header>

      <div className="flex flex-col gap-1 py-4">
        <p lang={lang} className="text-sm text-muted break-words">
          {pick(deal.item, lang)}
        </p>
        <p className="agate text-3xl font-semibold tracking-tight">
          {formatPrice(deal.price, lang)}
          {deal.quantity > 1 && <span className="text-base font-normal text-muted"> × {deal.quantity}</span>}
        </p>
        {deal.delivery && (
          <p className="text-sm text-muted">
            {deal.delivery.method === "pickup" ? t("deal.pickup") : t("deal.delivery")}
            {deal.delivery.date && <span className="agate"> · {deal.delivery.date}</span>}
          </p>
        )}
        {deal.offerMessage && <p className="mt-2 text-sm italic break-words">&ldquo;{deal.offerMessage}&rdquo;</p>}
      </div>

      <details open={pending} className="group border-t border-border">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-muted hover:text-text [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-1.5">
            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open:rotate-90">
              <path d="M4.5 2.5 8 6l-3.5 3.5" />
            </svg>
            {t("deal.terms")}
          </span>
          <span className="agate text-xs">{t("deal.countAgreed", { n: signed })}</span>
        </summary>

        {conditions.length > 0 && (
          <ul lang={lang} className="flex list-disc flex-col gap-1 pb-3 pl-5 text-sm text-ink-2 marker:text-muted">
            {conditions.map((c, i) => (
              <li key={i} className="break-words">{c}</li>
            ))}
          </ul>
        )}

        <ul className="divide-y divide-border border-t border-border text-sm">
          {(["buyer", "seller"] as const).map((r) => (
            <li key={r} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
              <span className="min-w-0 break-words">
                {names[r]} {r === myRole && <span className="text-muted">{t("deal.you")}</span>}
              </span>
              <span className={`agate text-xs ${deal.agreedBy[r] ? "text-success" : "text-muted"}`}>
                {deal.agreedBy[r] ? t("deal.agreedAt", { when: when(deal.agreedBy[r]!) }) : t("deal.notYet")}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {canAgree && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <button type="button" onClick={handleAgree} disabled={busy || rejecting} aria-busy={busy} className="btn btn-primary flex-1">
            {busy ? t("deal.agreeing") : t("deal.agree")}
          </button>
          {canCounter && (
            <button type="button" onClick={() => onCounter(deal)} disabled={busy || rejecting} className="btn btn-secondary">
              {t("deal.counter")}
            </button>
          )}
          {canReject && (
            <button type="button" onClick={handleReject} disabled={busy || rejecting} aria-busy={rejecting} className="btn btn-quiet text-danger">
              {rejecting ? t("deal.declining") : t("deal.decline")}
            </button>
          )}
        </div>
      )}

      {isCreator && pending && (
        <p className="meta border-t border-border pt-3">{t("deal.waitingFor", { name: otherName })}</p>
      )}

      {failed && (
        <p role="alert" className="note note-error mt-3">
          {failed}
        </p>
      )}

      {agreed && deal.sealCode && <SealBlock code={deal.sealCode} t={t} />}
    </article>
  );
}

function StatusPill({ status, t }: { status: Deal["status"]; t: T }) {
  const [label, tone] =
    status === "agreed"
      ? [t("deal.agreedByBoth"), "bg-success-bg text-success"]
      : status === "rejected"
      ? [t("deal.declined"), "bg-danger-bg text-danger"]
      : [t("deal.waiting"), "bg-guard-bg text-ink-2"];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tone}`}>{label}</span>;
}

/** Handshake Seal: show the QR at pickup; scanning it opens the verified deal. */
function SealBlock({ code, t }: { code: string; t: T }) {
  const proof = useSealProof(code);
  const url = useSealUrl(code, proof);
  return (
    <section aria-label="Handshake Seal" className="mt-1 flex flex-wrap items-start gap-4 border-t border-border pt-4">
      <SealQr url={url} size={112} />
      <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-success">{t("deal.seal")}</p>
        <p className="text-sm text-ink-2">{t("deal.sealBody")}</p>
        <Link href={`/seal/${encodeURIComponent(code)}${proof ? `#p=${proof}` : ""}`} className="link mt-1 inline-flex min-h-tap items-center self-start text-sm">
          {t("deal.openSeal")}
        </Link>
      </div>
    </section>
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
