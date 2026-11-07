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
        <h1 className="page-title">{error.notFound ? "No Handshake Seal with this code" : "Couldn't check this seal"}</h1>
        <p className="max-w-prose text-muted">
          {error.notFound
            ? "A seal only exists after both sides agree to a deal. Ask the other person to open the deal in their Handshake chat and show you its QR code."
            : error.text}
        </p>
        {!error.notFound && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!lang || !seal) return <SealSkeleton />;

  const { deal } = seal;
  const when = (iso: string) => new Date(iso).toLocaleString(localeFor(lang), { dateStyle: "medium", timeStyle: "short" });
  const conditions = pick(deal.conditions, lang) ?? [];
  const demo = deal.listingId.startsWith("demo_");

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="page-title flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-6 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 10.5l4 4 8-9" strokeLinecap="square" />
          </svg>
          Verified Handshake Seal
        </h1>
        <label className="flex flex-col gap-1 sm:w-48">
          <span className="label">Read in</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)} className="field">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </label>
      </header>

      <article aria-label="Agreed deal" className="flex flex-col">
        <hr className="rule-double" />
        <div className="flex flex-col gap-1 py-4">
          <h2 lang={lang} className="section-title">
            {pick(deal.item, lang)}
          </h2>
          {demo && <p className="meta">Demo</p>}
          <p className="agate text-4xl leading-tight">
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
        {conditions.length > 0 && (
          <ul lang={lang} className="border-t border-border">
            {conditions.map((c) => (
              <li key={c} className="border-b border-border py-2">
                {c}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 border-t border-border text-sm">
          <Row term="Buyer">
            {seal.buyer.displayName}
            {deal.agreedBy.buyer && (
              <span className="meta block">
                agreed <span className="agate">{when(deal.agreedBy.buyer)}</span>
              </span>
            )}
          </Row>
          <Row term="Seller">
            {seal.seller.displayName}
            {deal.agreedBy.seller && (
              <span className="meta block">
                agreed <span className="agate">{when(deal.agreedBy.seller)}</span>
              </span>
            )}
          </Row>
          <Row term="Sealed">
            <span className="agate">{when(seal.sealedAt)}</span>
          </Row>
          <Row term="Code">
            <span className="agate break-all">{code}</span>
          </Row>
        </dl>
        <hr className="rule-double mt-4" />
      </article>

      <div className="note note-success flex items-start gap-4">
        <SealQr url={url} size={128} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <p>Both people saw these exact terms in their own language and agreed to them on Handshake.</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {}
            }}
            className="btn btn-secondary"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>

      <p className="meta max-w-prose">
        Only trust a seal shown on this site. Handshake looks up the code on our server, so a screenshot proves nothing by itself. Scan the QR
        code or open the link yourself.
      </p>

      <Link href="/" className="link self-start text-sm">
        What is Handshake?
      </Link>
    </section>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-3 border-b border-border py-2">
      <dt className="text-muted">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Loading: the seal document's shape, ruled. */
export function SealSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the seal" className="flex flex-col gap-4">
      <div className="skeleton h-9 w-3/4" />
      <div className="skeleton h-40" />
      <div className="skeleton h-32" />
    </div>
  );
}
