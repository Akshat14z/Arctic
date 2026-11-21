"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatCreateResponseSchema, ListingDetailResponseSchema, type LangCode, type Listing } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES, preferredLanguage } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { DemoBadge } from "@/components/listing-card";
import { ShareListing } from "@/components/share-listing";

/** Opens (or reuses) the buyer's chat for this listing. Guests sign in first and come back here. */
function ChatWithSeller({ listingId }: { listingId: string }) {
  const session = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (!session) {
      router.push(`/signup?next=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const chat = await api("/api/chats", {
        method: "POST",
        body: { listingId },
        token: session.sessionToken,
        schema: ChatCreateResponseSchema,
      });
      router.push(`/chats/${encodeURIComponent(chat.channelId)}`);
    } catch (e) {
      setError(friendlyMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        aria-busy={busy}
        className="btn btn-primary w-full py-3.5 text-base font-semibold shadow-md"
      >
        {busy ? "Opening Negotiation Chat…" : "💬 Chat with Seller & Make Offer"}
      </button>
      {error && (
        <p role="alert" className="note note-error text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const [guestLang, setGuestLang] = useState<LangCode | null>(null);
  useEffect(() => setGuestLang(preferredLanguage(navigator.languages)), []);
  const lang = session?.user.language ?? guestLang ?? "en";
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const hydrated = session !== undefined && (session !== null || guestLang !== null);
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    setError(null);
    api(`/api/listings/${encodeURIComponent(id)}?lang=${lang}`, { schema: ListingDetailResponseSchema }).then(
      (r) => live && setListing(r.listing),
      (e) => live && setError({ text: friendlyMessage(e), notFound: e instanceof ApiError && e.status === 404 }),
    );
    return () => {
      live = false;
    };
  }, [id, lang, attempt, hydrated]);

  if (error) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="page-title text-2xl font-bold">{error.notFound ? "Listing not found" : "Couldn't load this listing"}</h1>
        <p className="meta max-w-md">{error.text}</p>
        {error.notFound ? (
          <Link href="/listings" className="btn btn-primary">
            Back to Marketplace
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="btn btn-primary"
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!listing)
    return (
      <div aria-busy className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
        <div className="skeleton aspect-[4/3] w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-10 w-3/4 rounded-xl" />
          <div className="skeleton h-8 w-1/3 rounded-xl" />
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl mt-4" />
        </div>
      </div>
    );

  const mine = session?.user.id === listing.sellerId;
  const original = listing.lang !== lang ? LANGUAGES.find((l) => l.code === listing.lang) : undefined;
  const textLang = original ? lang : listing.lang;

  return (
    <article data-wide className="flex flex-col gap-6 py-2">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted">
        <Link href="/listings" className="hover:text-text transition-colors">Marketplace</Link>
        <span>/</span>
        <span className="text-text font-medium truncate max-w-xs">{listing.title}</span>
      </nav>

      {/* Main Showcase Grid */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {/* Left: Product Image */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm">
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.imageUrl}
              alt={listing.title}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
          ) : (
            <div aria-hidden className="grid aspect-[4/3] w-full place-items-center font-display text-8xl text-muted/40">
              {listing.title.trim().charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Right: Pricing, Actions, Description */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {listing.isDemo && <DemoBadge />}
              {original && (
                <span className="agate rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                  Written in {original.native} · Translated to your language
                </span>
              )}
            </div>

            <h1 lang={textLang} className="text-2xl sm:text-3xl font-bold tracking-tight text-text leading-tight">
              {listing.title}
            </h1>

            <div className="flex items-baseline justify-between border-y border-border/80 py-3">
              <div>
                <span className="meta text-xs block">Offered At</span>
                <span className="agate text-3xl font-black text-text">
                  {formatPrice(listing.price, lang)}
                </span>
              </div>
              <span className="agate text-xs text-muted">Fixed & Negotiable</span>
            </div>

            {mine ? (
              <div className="rounded-xl bg-surface-2 p-3 text-center text-xs text-muted font-medium">
                This is your listing. Check your chats to respond to buyer inquiries.
              </div>
            ) : (
              <ChatWithSeller listingId={listing.id} />
            )}
          </div>

          {/* Description Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-3">
            <h2 className="text-base font-semibold text-text">Item Details</h2>
            <p lang={textLang} className="text-sm text-text leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>

            {listing.seller && (
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-accent text-white font-bold text-xs">
                    {listing.seller.displayName.trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-text">{listing.seller.displayName}</p>
                    <p className="meta text-[11px]">Verified Seller</p>
                  </div>
                </div>
                <time dateTime={listing.createdAt} className="agate text-muted">
                  Listed {new Date(listing.createdAt).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short", year: "numeric" })}
                </time>
              </div>
            )}
          </div>

          {/* Guarantee / Trust Features */}
          <div className="rounded-2xl border border-border bg-surface-2 p-4 text-xs text-muted grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <span className="text-base">🛡️</span>
              <div>
                <p className="font-semibold text-text">Handshake Seal</p>
                <p className="text-[11px]">Mutual deal locking with tamper-proof QR code.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">🌐</span>
              <div>
                <p className="font-semibold text-text">Auto-Translation</p>
                <p className="text-[11px]">Chat across 8 languages with zero language barriers.</p>
              </div>
            </div>
          </div>

          {/* Share */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <ShareListing listing={listing} lang={lang} mine={mine} />
          </div>
        </div>
      </div>
    </article>
  );
}
