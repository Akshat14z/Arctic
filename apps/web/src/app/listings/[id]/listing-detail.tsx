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
      router.push(`/onboarding?next=${encodeURIComponent(`/listings/${listingId}`)}`);
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
        className="btn btn-primary w-full sm:w-auto sm:self-start"
      >
        {busy ? "Opening chat…" : "Chat with seller"}
      </button>
      {error && (
        <p role="alert" className="note note-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  // Guests (often arriving from a WhatsApp link) read in their browser's language until they pick one.
  const [guestLang, setGuestLang] = useState<LangCode | null>(null);
  useEffect(() => setGuestLang(preferredLanguage(navigator.languages)), []);
  const lang = session?.user.language ?? guestLang ?? "en";
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const hydrated = session !== undefined && (session !== null || guestLang !== null);
  useEffect(() => {
    if (!hydrated) return; // wait for the session so we fetch once, in the right language
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
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="page-title">{error.notFound ? "Listing not found" : "Couldn't load this listing"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/listings" className="btn btn-primary">
            Browse listings
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
      <div aria-busy className="flex flex-col gap-4">
        <div className="skeleton aspect-[4/3] w-full" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-6 w-1/3" />
        <div className="skeleton h-20 w-full" />
      </div>
    );

  const mine = session?.user.id === listing.sellerId;
  const original = listing.lang !== lang ? LANGUAGES.find((l) => l.code === listing.lang) : undefined;
  const textLang = original ? lang : listing.lang; // the server translates title + description for ?lang=

  return (
    <article className="flex flex-col gap-5">
      {listing.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs
        <img src={listing.imageUrl} alt={listing.title} className="aspect-[4/3] w-full border border-border object-cover" />
      )}

      <div className="flex flex-col gap-2">
        <h1 lang={textLang} className="page-title text-balance">
          {listing.title}
        </h1>
        <div className="flex items-center gap-3">
          <p className="agate text-xl">{formatPrice(listing.price, lang)}</p>
          {listing.isDemo && <DemoBadge />}
        </div>
        {original && (
          <p className="meta">
            Written in <span lang={original.code}>{original.native}</span>
          </p>
        )}
      </div>

      <p lang={textLang} className="max-w-prose whitespace-pre-line text-pretty">
        {listing.description}
      </p>

      {!mine && <ChatWithSeller listingId={listing.id} />}

      <div className="border-t border-border pt-4">
        <ShareListing listing={listing} lang={lang} mine={mine} />
      </div>

      <div className="meta flex items-center justify-between gap-3 border-t border-border pt-4">
        <span>{mine ? "This is your listing." : listing.seller ? `Sold by ${listing.seller.displayName}` : null}</span>
        <time dateTime={listing.createdAt} className="agate">
          {new Date(listing.createdAt).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
        </time>
      </div>
    </article>
  );
}
