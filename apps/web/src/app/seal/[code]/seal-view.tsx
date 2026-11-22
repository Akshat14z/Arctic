"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SealDetailResponseSchema, type LangCode, type Money, type SealDetailResponse } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES, preferredLanguage } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { SealQr, useSealUrl } from "@/components/seal-qr";
import { checkSealToken, proofFromHash, type SealCheck } from "@/lib/seal-proof";

const pick = <T,>(r: Partial<Record<LangCode, T>>, lang: LangCode) => r[lang] ?? r.en ?? Object.values(r)[0];

export function SealView() {
  const { code } = useParams<{ code: string }>();
  const session = useSession();
  const [lang, setLang] = useState<LangCode | null>(null);
  const [seal, setSeal] = useState<SealDetailResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState<SealCheck | null>(null);
  const url = useSealUrl(code, seal?.proof);

  // The signed summary in the link's #p= fragment, checked on this device with CommonGrounds' public key.
  useEffect(() => {
    const proof = proofFromHash(window.location.hash);
    if (proof) void checkSealToken(proof).then(setCheck);
  }, []);

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

  // A definite "no such seal" from our server wins over the signature; the offline view is only for an unreachable server.
  if (error && !error.notFound && check?.status === "valid" && check.payload.c === code) return <OfflineSeal check={check} />;

  if (error) {
    return (
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="page-title">{error.notFound ? "No CommonGrounds Seal with this code" : "Couldn't check this seal"}</h1>
        <p className="max-w-prose text-muted">
          {error.notFound
            ? "A seal only exists after both sides agree to a deal. Ask the other person to open the deal in their CommonGrounds chat and show you its QR code."
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

  // The signed summary must match the live record: same code and price.
  const mismatch = check?.status === "valid" && (check.payload.c !== code || check.payload.p !== deal.price.amount || check.payload.cur !== deal.price.currency);
  // A changed link never sits under a green "Verified" heading (same condition as ProofBanner's red state).
  const tampered = !!check && check.status !== "unsupported" && (check.status !== "valid" || !!mismatch);

  return (
    <section className="flex flex-col gap-6">
      <ProofBanner check={check} mismatch={!!mismatch} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {tampered ? (
          <h1 className="page-title">The real terms of this deal</h1>
        ) : (
          <h1 className="page-title flex items-center gap-2">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-6 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 10.5l4 4 8-9" strokeLinecap="square" />
            </svg>
            Verified CommonGrounds Seal
          </h1>
        )}
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
          <p>Both people saw these exact terms in their own language and agreed to them on CommonGrounds.</p>
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
        The QR code carries CommonGrounds&apos;s digital signature of these terms. Scanning it checks the signature on your own phone, so
        the price and names can&apos;t be faked, even without internet. A screenshot of this page proves nothing; scan the code.
      </p>

      <Link href="/" className="link inline-flex min-h-tap items-center self-start text-sm">
        What is CommonGrounds?
      </Link>
    </section>
  );
}

/** What the on-device signature check found. Nothing to show when the link carried no proof. */
function ProofBanner({ check, mismatch }: { check: SealCheck | null; mismatch: boolean }) {
  if (!check) return null;
  if (check.status === "valid" && !mismatch)
    return (
      <p role="status" className="note note-success">
        <strong>Signed by CommonGrounds.</strong> Checked on this device: these terms haven&apos;t been changed since both people agreed.
      </p>
    );
  if (check.status === "unsupported")
    return (
      <p role="status" className="note">
        This browser can&apos;t check the signature itself. The CommonGrounds server confirmed the seal below.
      </p>
    );
  return (
    <p role="alert" className="note note-error">
      <strong>Someone changed this link.</strong> The terms below come straight from CommonGrounds and are the real ones. If you were shown a different
      price or item, don&apos;t go ahead.
    </p>
  );
}

/** CommonGrounds' server can't be reached, but the link's signature holds: show the signed core terms. */
function OfflineSeal({ check }: { check: Extract<SealCheck, { status: "valid" }> }) {
  const p = check.payload;
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null);
  return (
    <section className="flex flex-col gap-6">
      <ProofBanner check={check} mismatch={false} />
      <h1 className="page-title">Verified CommonGrounds Seal</h1>
      <p className="meta">CommonGrounds&apos;s server can&apos;t be reached right now, so these are the signed core terms carried in the link.</p>
      <article aria-label="Agreed deal" className="tile gap-1">
        <h2 className="section-title break-words">{p.i}</h2>
        <p className="agate text-4xl leading-tight">
          {formatPrice({ amount: p.p, currency: p.cur as Money["currency"] }, "en")}
          {p.q > 1 && <span className="text-base text-muted"> × {p.q}</span>}
        </p>
        {p.d && <p className="meta">{p.d === "pickup" ? "Pickup" : "Shipping"}</p>}
        <dl className="mt-3 border-t border-border text-sm">
          <Row term="Buyer">
            {p.b}
            {p.ba && <span className="meta block">agreed <span className="agate">{when(p.ba)}</span></span>}
          </Row>
          <Row term="Seller">
            {p.s}
            {p.sa && <span className="meta block">agreed <span className="agate">{when(p.sa)}</span></span>}
          </Row>
          <Row term="Sealed">
            <span className="agate">{when(p.t)}</span>
          </Row>
          <Row term="Code">
            <span className="agate break-all">{p.c}</span>
          </Row>
        </dl>
      </article>
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
