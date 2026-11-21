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
  const [step, setStep] = useState<"input" | "confirm">("input");
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

  if (!isOpen) return null;

  const numPrice = parseFloat(price.trim().replace(/,/g, ""));
  const isPriceValid = !isNaN(numPrice) && numPrice > 0;
  const currency = originalPrice?.currency ?? "INR";

  function handleProceedToConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!isPriceValid) {
      setError("Please enter a valid final offer price greater than zero.");
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function handleConfirmAndSend() {
    if (!isPriceValid || busy) return;
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
      onClose();
      // Reset form
      setStep("input");
      setMessage("");
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  // Rendered on <body>, so no transformed parent can shrink the backdrop to the page column.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-lg flex-col gap-5 rounded-[24px] border border-border bg-surface p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2
              id="offer-modal-title"
              className="text-xl font-semibold text-text"
            >
              {step === "input" ? "Make an Offer" : "Confirm Your Offer"}
            </h2>
            <p className="meta text-xs">
              {step === "input"
                ? `Propose a structured deal to ${recipientName}`
                : "Review the offer details before sending"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-[var(--color-rule)] hover:text-text"
          >
            <svg
              aria-hidden
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m3.5 3.5 7 7m0-7-7 7" />
            </svg>
          </button>
        </div>

        {/* Step 1: Input Form */}
        {step === "input" ? (
          <form
            onSubmit={handleProceedToConfirm}
            className="flex flex-col gap-4"
          >
            {/* Listing Reference */}
            <div className="flex items-center justify-between rounded-[var(--radius-field)] bg-surface-2 p-3">
              <div className="min-w-0 flex-1">
                <span className="meta text-xs">Item</span>
                <p className="text-sm font-medium break-words">
                  {listingTitle}
                </p>
              </div>
              {originalPrice && (
                <div className="text-right">
                  <span className="meta text-xs">Listed at</span>
                  <p className="agate text-sm font-semibold">
                    {formatPrice(originalPrice, lang)}
                  </p>
                </div>
              )}
            </div>

            {/* Mandatory Offer Price */}
            <label className="flex flex-col gap-1.5">
              <span className="label flex items-center justify-between">
                <span>Your price</span>
                <span className="agate text-xs text-muted">
                  Currency: {currency}
                </span>
              </span>
              <div className="relative flex items-center">
                <span className="agate pointer-events-none absolute left-3 text-base text-muted font-semibold">
                  {currency === "INR" ? "₹" : "$"}
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  autoFocus
                  placeholder="e.g. 12500"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (error) setError(null);
                  }}
                  className="field pl-8 text-lg font-semibold"
                />
              </div>
              <span className="hint text-xs">
                If both of you agree, this exact amount goes on the Seal.
              </span>
            </label>

            {/* Delivery Method */}
            <div className="flex flex-col gap-1.5">
              <span className="label">Handover</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDelivery("pickup")}
                  aria-pressed={delivery === "pickup"}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-[var(--radius-field)] border px-3 py-2 text-sm transition-all ${
                    delivery === "pickup"
                      ? "border-accent bg-accent/10 font-semibold text-accent"
                      : "border-border bg-surface text-muted hover:border-[var(--color-rule-2)]"
                  }`}
                >
                  <span>Pickup in person</span>
                  <span className="text-xs font-normal text-muted">
                    Scan the Seal at handover
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDelivery("shipping")}
                  aria-pressed={delivery === "shipping"}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-[var(--radius-field)] border px-3 py-2 text-sm transition-all ${
                    delivery === "shipping"
                      ? "border-accent bg-accent/10 font-semibold text-accent"
                      : "border-border bg-surface text-muted hover:border-[var(--color-rule-2)]"
                  }`}
                >
                  <span>Delivery</span>
                  <span className="text-xs font-normal text-muted">
                    Courier or post
                  </span>
                </button>
              </div>
            </div>

            {/* Optional Note */}
            <label className="flex flex-col gap-1.5">
              <span className="label">Note to {recipientName} (Optional)</span>
              <textarea
                rows={2}
                maxLength={300}
                placeholder="e.g., Can complete payment and pickup today evening."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="field resize-none text-sm"
              />
            </label>

            {error && (
              <p role="alert" className="note note-error text-sm">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isPriceValid}
                className="btn btn-primary px-6 font-semibold"
              >
                Review offer
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Screen */
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-field)] border border-border bg-surface-2 p-4">
              <h3 className="agate mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Offer Summary
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="meta text-xs">Item</dt>
                  <dd className="font-medium break-words">{listingTitle}</dd>
                </div>
                <div>
                  <dt className="meta text-xs">Offered To</dt>
                  <dd className="font-medium text-text">
                    {recipientName} ({recipientRole})
                  </dd>
                </div>
                {originalPrice && (
                  <div>
                    <dt className="meta text-xs">Original Listed Price</dt>
                    <dd className="agate line-through text-muted">
                      {formatPrice(originalPrice, lang)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="meta text-xs">Proposed Offer Price</dt>
                  <dd className="agate text-lg font-bold text-accent">
                    {formatPrice({ amount: numPrice, currency }, lang)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="meta text-xs">Fulfillment Method</dt>
                  <dd className="text-text font-medium">
                    {delivery === "pickup"
                      ? "In-Person Inspection & Handover (Handshake Seal)"
                      : "Courier / Tracked Shipping"}
                  </dd>
                </div>
                {message.trim() && (
                  <div className="col-span-2 rounded-lg bg-surface p-2.5">
                    <dt className="meta text-xs">Your Note</dt>
                    <dd className="text-text italic">
                      &ldquo;{message.trim()}&rdquo;
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-900">
              <p className="font-medium">
                Are you sure you want to send this offer?
              </p>
              <p className="mt-0.5 opacity-90">
                This structured offer will appear directly in the negotiation
                chat. Both parties must mutually agree to finalize and seal the
                deal.
              </p>
            </div>

            {error && (
              <p role="alert" className="note note-error text-sm">
                {error}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep("input")}
                disabled={busy}
                className="btn btn-secondary"
              >
                ← Back to Edit
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="btn btn-quiet"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={busy}
                  aria-busy={busy}
                  className="btn btn-primary px-6 font-semibold"
                >
                  {busy ? "Sending Offer…" : "Confirm & Send Offer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
