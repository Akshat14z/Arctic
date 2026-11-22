"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Deal, LangCode, Money } from "@convocart/contracts";
import {
  CreateOfferRequestSchema,
  DealResponseSchema,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { translator } from "@/lib/i18n";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  token: string;
  lang: LangCode;
  listingTitle: string;
  originalPrice?: Money;
  recipientName: string;
  recipientRole: "buyer" | "seller";
  initialPrice?: number;
  onOfferSent: (deal: Deal) => Promise<void>;
};

export function OfferModal({
  isOpen,
  onClose,
  channelId,
  token,
  lang,
  listingTitle,
  originalPrice,
  recipientName,
  recipientRole,
  initialPrice,
  onOfferSent,
}: Props) {
  const [price, setPrice] = useState<string>(
    initialPrice
      ? String(initialPrice)
      : originalPrice
        ? String(originalPrice.amount)
        : "",
  );
  const [message, setMessage] = useState<string>("");
  const [delivery, setDelivery] = useState<"pickup" | "shipping">("pickup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translator(lang);
  if (!isOpen) return null;

  const numPrice = parseFloat(price.trim().replace(/,/g, ""));
  const isPriceValid = !isNaN(numPrice) && numPrice > 0;
  const currency = originalPrice?.currency ?? "INR";

  // One step: the offer is not binding until the other side agrees, so a second "are you sure" screen only adds friction.
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isPriceValid) return setError(t("offer.priceInvalid"));
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/deals/create", {
        method: "POST",
        body: {
          channelId,
          priceAmount: numPrice,
          currency,
          message: message.trim() || undefined,
          deliveryMethod: delivery,
        },
        token,
        schema: DealResponseSchema,
      });

      await onOfferSent(res.deal);
      setBusy(false); // the component stays mounted while closed, so reset for the next offer
      setMessage("");
      onClose();
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  const pick = (value: "pickup" | "shipping", title: string, hint: string) => (
    <button
      type="button"
      onClick={() => setDelivery(value)}
      aria-pressed={delivery === value}
      className="flex min-h-14 flex-col items-start justify-center rounded-[var(--radius-field)] border border-border bg-surface px-3 py-2 text-left text-sm aria-pressed:border-accent aria-pressed:bg-surface-2 aria-pressed:font-semibold"
    >
      <span>{title}</span>
      <span className="text-xs font-normal text-muted">{hint}</span>
    </button>
  );

  // Rendered on <body>, so no transformed parent can shrink the backdrop to the page column.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[color-mix(in_oklab,var(--color-ink)_55%,transparent)] p-4"
    >
      <form onSubmit={send} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[0_24px_60px_-24px_var(--color-shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="offer-modal-title" className="text-lg font-semibold">
              {t("chat.makeOffer")}
            </h2>
            <p className="meta">{t("offer.sub", { name: recipientName })}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("offer.close")} className="btn btn-icon shrink-0">
            <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m3.5 3.5 7 7m0-7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-y border-border py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="meta text-xs">{t("offer.item")}</span>
            <span className="text-sm font-medium break-words">{listingTitle}</span>
          </div>
          {originalPrice && (
            <div className="flex flex-col">
              <span className="meta text-xs">{t("offer.listedAt")}</span>
              <span className="agate text-sm font-semibold">{formatPrice(originalPrice, lang)}</span>
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="label">
            {t("offer.price")} <span className="agate font-normal text-muted">({currency})</span>
          </span>
          <span className="relative flex items-center">
            <span aria-hidden className="agate pointer-events-none absolute left-3 text-base font-semibold text-muted">
              {currency === "INR" ? "₹" : "$"}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="1"
              required
              autoFocus
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (error) setError(null);
              }}
              className="field pl-8 text-lg font-semibold"
            />
          </span>
          <span className="hint">{t("offer.priceHint")}</span>
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="label mb-1.5">{t("offer.handover")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {pick("pickup", t("deal.pickup"), t("offer.pickupHint"))}
            {pick("shipping", t("deal.delivery"), t("offer.deliveryHint"))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="label">
            {t("offer.note", { name: recipientName })} <span className="hint">{t("help.optional")}</span>
          </span>
          <textarea rows={2} maxLength={300} placeholder={t("offer.notePlaceholder")} value={message} onChange={(e) => setMessage(e.target.value)} className="field resize-none text-sm" />
        </label>

        {error && (
          <p role="alert" className="note note-error">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-quiet">
            {t("chat.cancel")}
          </button>
          <button type="submit" disabled={busy || !isPriceValid} aria-busy={busy} className="btn btn-primary">
            {busy ? t("chat.sending") : t("offer.send")}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
