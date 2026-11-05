"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListingCreateRequestSchema,
  ListingDetailResponseSchema,
  MoneySchema,
  type Money,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { LANGUAGES } from "@/lib/languages";
import { useRequireSession } from "@/lib/use-require-session";

const CURRENCIES = MoneySchema.shape.currency.removeDefault().options;
const input = "min-h-tap w-full rounded-lg border border-border bg-surface px-3 text-base";

export function NewListingForm() {
  const session = useRequireSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Money["currency"] | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (!session) return <div className="min-h-40" aria-busy />; // redirecting to onboarding, or hydrating

  const lang = session.user.language;
  const cur = currency ?? (lang === "ja" ? "JPY" : "INR");
  const price = Number(amount);
  const writtenIn = LANGUAGES.find((l) => l.code === lang)?.native;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !session) return;
    const body = {
      title: title.trim(),
      description: description.trim(),
      price: { amount: price, currency: cur },
      ...(imageUrl.trim() && { imageUrl: imageUrl.trim() }),
    };
    const parsed = ListingCreateRequestSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        fieldErrors[key] ??= key === "price" ? "Enter a price above 0." : key === "imageUrl" ? "Use a full link starting with https://" : issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    setFailure(null);
    try {
      const { listing } = await api("/api/listings", {
        method: "POST",
        body: parsed.data,
        token: session.sessionToken,
        schema: ListingDetailResponseSchema,
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setFailure(friendlyMessage(err));
      setBusy(false);
    }
  }

  const error = (key: string) =>
    errors[key] && (
      <span id={`${key}-error`} className="text-sm text-danger">
        {errors[key]}
      </span>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sell something</h1>
        <p className="text-muted">
          Write in <span lang={lang}>{writtenIn}</span>. Buyers read it in their own language.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Title</span>
        <input
          lang={lang}
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          className={input}
        />
        {error("title")}
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Description</span>
        <textarea
          lang={lang}
          rows={5}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          className={`${input} py-2`}
          placeholder="Condition, size, what's included, where to pick up"
        />
        {error("description")}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Price</legend>
        <div className="flex gap-2">
          <select
            aria-label="Currency"
            value={cur}
            onChange={(e) => setCurrency(e.target.value as Money["currency"])}
            className="min-h-tap rounded-lg border border-border bg-surface px-3"
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            inputMode="decimal"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={!!errors.price}
            aria-describedby={errors.price ? "price-error" : "price-preview"}
            className={input}
            placeholder="200000"
          />
        </div>
        {price > 0 && !errors.price && (
          <span id="price-preview" className="text-sm text-muted">
            Buyers will see <strong className="text-text">{formatPrice({ amount: price, currency: cur }, lang)}</strong>
          </span>
        )}
        {error("price")}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-medium">
          Photo link <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          type="url"
          inputMode="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          aria-invalid={!!errors.imageUrl}
          aria-describedby={errors.imageUrl ? "imageUrl-error" : undefined}
          className={input}
          placeholder="https://"
        />
        {error("imageUrl")}
      </label>

      {failure && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-danger">
          {failure}
        </p>
      )}

      <button type="submit" disabled={busy} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50">
        {busy ? "Posting…" : "Post listing"}
      </button>
    </form>
  );
}
