"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatCreateResponseSchema, ListingDetailResponseSchema, type Listing } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES } from "@/lib/languages";
import { useSession } from "@/lib/session";
import { DemoBadge } from "@/components/listing-card";

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
        className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
      >
        {busy ? "Opening chat…" : "Chat with seller"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const lang = session?.user.language ?? "en";
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const hydrated = session !== undefined;
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
        <h1 className="text-2xl font-semibold">{error.notFound ? "Listing not found" : "Couldn't load this listing"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/listings" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Browse listings
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg"
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!listing) return <div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />;

  const mine = session?.user.id === listing.sellerId;
  const original = listing.lang !== lang ? LANGUAGES.find((l) => l.code === listing.lang) : undefined;

  return (
    <article className="flex flex-col gap-5">
      {listing.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary seller URLs
        <img src={listing.imageUrl} alt={listing.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <h1 lang={listing.lang} className="text-2xl font-semibold tracking-tight text-balance">
            {listing.title}
          </h1>
          {listing.isDemo && <DemoBadge />}
        </div>
        <p className="text-2xl font-semibold">{formatPrice(listing.price, lang)}</p>
        {original && (
          <p className="text-sm text-muted">
            Written in <span lang={original.code}>{original.native}</span>
          </p>
        )}
      </div>

      <p lang={listing.lang} className="whitespace-pre-line text-pretty">
        {listing.description}
      </p>

      {!mine && <ChatWithSeller listingId={listing.id} />}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted">
        <span>{mine ? "This is your listing." : listing.seller ? `Sold by ${listing.seller.displayName}` : null}</span>
        <time dateTime={listing.createdAt}>
          {new Date(listing.createdAt).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
        </time>
      </div>
    </article>
  );
}
