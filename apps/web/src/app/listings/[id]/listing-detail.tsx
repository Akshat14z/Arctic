"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatCreateResponseSchema, ListingDetailResponseSchema, type LangCode, type Listing } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES, preferredLanguage } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { DemoBadge, ListingImage } from "@/components/listing-card";
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
        {busy ? "Opening the chat…" : "Chat with the seller"}
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
    <article data-wide className="flex flex-col gap-6">
      <Link href="/listings" className="link inline-flex min-h-tap items-center gap-1 self-start text-sm">
        <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8.5 3 4.5 7l4 4" />
        </svg>
        Browse
      </Link>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-2">
          <ListingImage src={listing.imageUrl} title={listing.title} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            {(listing.isDemo || original) && (
              <div className="flex flex-wrap items-center gap-2">
                {listing.isDemo && <DemoBadge />}
                {original && <span className="meta">Written in {original.native}, shown in your language</span>}
              </div>
            )}
            <h1 lang={textLang} className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
              {listing.title}
            </h1>
            <p className="agate text-3xl font-semibold">{formatPrice(listing.price, lang)}</p>
          </div>

          {mine ? (
            <p className="note">This is your listing. Buyers&apos; messages show up in Chats.</p>
          ) : (
            <ChatWithSeller listingId={listing.id} />
          )}

          {listing.description && (
            <section className="flex flex-col gap-2 border-t border-border pt-6">
              <h2 className="text-base font-semibold">About this item</h2>
              <p lang={textLang} className="max-w-[65ch] whitespace-pre-line break-words text-ink-2">
                {listing.description}
              </p>
            </section>
          )}

          {listing.seller && (
            <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold">
                  {listing.seller.displayName.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-medium break-words">{listing.seller.displayName}</p>
                  <p className="meta">Seller</p>
                </div>
              </div>
              <time dateTime={listing.createdAt} className="meta">
                Listed {new Date(listing.createdAt).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </section>
          )}

          <section className="border-t border-border pt-6">
            <ShareListing listing={listing} lang={lang} mine={mine} />
          </section>
        </div>
      </div>
    </article>
  );
}
