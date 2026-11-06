"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SealDetailResponseSchema, type LangCode, type SealDetailResponse } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES, preferredLanguage } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { SealQr, useSealUrl } from "@/components/seal-qr";

const pick = <T,>(r: Partial<Record<LangCode, T>>, lang: LangCode) => r[lang] ?? r.en ?? Object.values(r)[0];

export function SealView() {
  const { code } = useParams<{ code: string }>();
  const session = useSession();
  const [lang, setLang] = useState<LangCode | null>(null);
  const [seal, setSeal] = useState<SealDetailResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const url = useSealUrl(code);

  // The reader's language: their Handshake language if signed in, else the browser's. They can switch below.
  useEffect(() => {
    setLang((l) => l ?? session?.user.language ?? preferredLanguage(navigator.languages));
  }, [session]);

  useEffect(() => {
    if (!lang) return;
    let live = true;
    setError(null);
    api(`/api/seals/${encodeURIComponent(code)}?lang=${lang}`, { schema: SealDetailResponseSchema }).then(
      (s) => live && setSeal(s),
      (e) => live && setError({ text: friendlyMessage(e), notFound: e instanceof ApiError && e.status === 404 }),
    );
    return () => {
      live = false;
    };
  }, [code, lang, attempt]);

  if (error) {
    return (
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="text-2xl font-semibold">{error.notFound ? "No Handshake Seal with this code" : "Couldn't check this seal"}</h1>
        <p className="text-muted">
          {error.notFound
            ? "A seal only exists after both sides agree to a deal. Ask the other person to open the deal in their Handshake chat and show you its QR code."
            : error.text}
        </p>
        {!error.notFound && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!lang || !seal) return <div aria-busy className="h-96 animate-pulse rounded-xl bg-surface" />;

  const { deal } = seal;
  const when = (iso: string) => new Date(iso).toLocaleString(localeFor(lang), { dateStyle: "medium", timeStyle: "short" });
  const conditions = pick(deal.conditions, lang) ?? [];
  const demo = deal.listingId.startsWith("demo_");

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1 text-sm font-medium text-success">
          <span aria-hidden="true">✓</span> Verified Handshake Seal
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Read in
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as LangCode)}
            className="min-h-tap rounded-lg border border-border bg-surface px-2 text-text"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </label>
      </div>

      <article aria-label="Agreed deal" className="flex flex-col gap-4 rounded-2xl border-2 border-success bg-surface p-5">
        <div>
          {demo && <p className="mb-1 text-xs font-medium uppercase text-muted">Demo</p>}
          <h1 lang={lang} className="text-xl font-semibold">
            {pick(deal.item, lang)}
          </h1>
          <p className="text-3xl font-semibold">
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
            <ul lang={lang} className="mt-3 list-disc pl-5 text-sm">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Buyer</dt>
          <dd>
            {seal.buyer.displayName}
            {deal.agreedBy.buyer && <span className="text-muted"> · agreed {when(deal.agreedBy.buyer)}</span>}
          </dd>
          <dt className="text-muted">Seller</dt>
          <dd>
            {seal.seller.displayName}
            {deal.agreedBy.seller && <span className="text-muted"> · agreed {when(deal.agreedBy.seller)}</span>}
          </dd>
          <dt className="text-muted">Sealed</dt>
          <dd>{when(seal.sealedAt)}</dd>
          <dt className="text-muted">Code</dt>
          <dd className="font-mono break-all">{code}</dd>
        </dl>
      </article>

      <div className="flex items-center gap-4">
        <SealQr url={url} size={128} />
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-muted">Both people saw these exact terms in their own language and agreed to them on Handshake.</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {}
            }}
            className="min-h-tap rounded-lg border border-border px-3 font-medium"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">
        Only trust a seal shown on this site. Handshake looks up the code on our server, so a screenshot proves nothing by itself. Scan the QR
        code or open the link yourself.
      </p>

      <Link href="/" className="text-sm underline underline-offset-2">
        What is Handshake?
      </Link>
    </section>
  );
}
