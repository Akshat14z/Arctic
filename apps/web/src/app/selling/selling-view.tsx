"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChatListResponseSchema,
  ListingDeleteResponseSchema,
  ListingDetailResponseSchema,
  ListingListResponseSchema,
  type AuthResponse,
  type ChatSummary,
  type Listing,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { useRequireSession } from "@/lib/use-require-session";
import { DemoBadge, ListingImage } from "@/components/listing-card";

/**
 * Seller dashboard: your listings (edit, delete) and every buyer talking to you about them.
 * Built only on existing endpoints: GET /api/listings (filtered to you), PATCH/DELETE /api/listings/:id, GET /api/chats.
 */
export function SellingView() {
  const session = useRequireSession();
  if (!session) return <div aria-busy className="skeleton h-80" />;
  if (session.user.role === "agent")
    return (
      <p className="note">
        Support agents don&apos;t sell. Open the dispatch console to answer help
        requests.
      </p>
    );
  return <Dashboard session={session} />;
}

type Data = { listings: Listing[]; chats: ChatSummary[] };

// ponytail: walks every page of the public listing feed and keeps yours; add a seller filter to GET /api/listings
// when the catalogue grows past a few hundred listings.
async function myListings(userId: string): Promise<Listing[]> {
  const mine: Listing[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await api(
      `/api/listings${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      { schema: ListingListResponseSchema },
    );
    mine.push(...page.items.filter((l) => l.sellerId === userId));
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return mine;
}

function Dashboard({ session }: { session: AuthResponse }) {
  const { user } = session;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const [listings, chats] = await Promise.all([
      myListings(user.id),
      api("/api/chats", {
        token: session.sessionToken,
        schema: ChatListResponseSchema,
      }),
    ]);
    return {
      listings,
      chats: chats.items.filter((c) => c.listing.sellerId === user.id),
    };
  }, [user.id, session.sessionToken]);

  useEffect(() => {
    let live = true;
    setError(null);
    load().then(
      (d) => live && setData(d),
      (e) => live && setError(friendlyMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const replace = (l: Listing) =>
    setData(
      (d) =>
        d && { ...d, listings: d.listings.map((x) => (x.id === l.id ? l : x)) },
    );
  const remove = (id: string) =>
    setData(
      (d) => d && { ...d, listings: d.listings.filter((x) => x.id !== id) },
    );

  const unread = data?.chats.reduce((n, c) => n + c.unreadCount, 0) ?? 0;

  return (
    <section data-wide className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Selling</h1>
          <p className="text-muted">
            Your listings and the buyers talking to you about them.
          </p>
        </div>
        <Link href="/listings/new" className="btn btn-primary">
          List an item
        </Link>
      </header>

      {user.isDemo && (
        <p className="note">
          This demo seller is shared by everyone trying Handshake, so its
          listings can&apos;t be edited or deleted here.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="note note-error flex flex-wrap items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="btn btn-quiet"
          >
            Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <div aria-busy className="flex flex-col gap-4">
          <div className="skeleton h-16" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      )}

      {data && (
        <>
          <dl className="flex flex-wrap gap-x-10 gap-y-3 border-y border-border py-4">
            <Figure label="Listings" value={data.listings.length} />
            <Figure label="Buyer chats" value={data.chats.length} />
            <Figure label="Unread" value={unread} />
          </dl>

          <section
            aria-labelledby="listings-title"
            className="flex flex-col gap-4"
          >
            <h2 id="listings-title" className="text-lg font-semibold">
              Your listings
            </h2>
            {data.listings.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border p-6">
                <p className="font-medium">Nothing listed yet</p>
                <p className="text-muted">
                  Write it in your language. Buyers read it in theirs.
                </p>
                <Link href="/listings/new" className="btn btn-secondary">
                  List an item
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {data.listings.map((l) => (
                  <ListingRow
                    key={l.id}
                    listing={l}
                    chats={
                      data.chats.filter((c) => c.listing.id === l.id).length
                    }
                    locked={user.isDemo}
                    session={session}
                    onSaved={replace}
                    onDeleted={remove}
                  />
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="buyers-title"
            className="flex flex-col gap-4"
          >
            <h2 id="buyers-title" className="text-lg font-semibold">
              Buyers talking to you
            </h2>
            {data.chats.length === 0 ? (
              <p className="text-muted">
                No buyer has messaged you yet. Share a listing to get the first
                one.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {data.chats.map((c) => (
                  <li key={c.channelId}>
                    <Link
                      href={`/chats/${encodeURIComponent(c.channelId)}`}
                      className="flex min-h-tap items-start gap-3 py-3 text-text no-underline hover:bg-surface"
                    >
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold"
                      >
                        {c.otherUser.displayName.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium break-words">
                            {c.otherUser.displayName}
                          </span>
                          {c.lastMessage && (
                            <time
                              dateTime={c.lastMessage.at}
                              className="meta text-xs"
                            >
                              {new Date(c.lastMessage.at).toLocaleDateString(
                                localeFor(user.language),
                                { day: "numeric", month: "short" },
                              )}
                            </time>
                          )}
                        </span>
                        <span className="meta break-words">
                          About {c.listing.title}
                        </span>
                        {c.lastMessage && (
                          <span className="line-clamp-2 text-sm break-words">
                            {c.lastMessage.text}
                          </span>
                        )}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="agate shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-ink)]">
                          {c.unreadCount}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <dt className="meta">{label}</dt>
      <dd className="agate text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function ListingRow(props: {
  listing: Listing;
  chats: number;
  locked: boolean;
  session: AuthResponse;
  onSaved: (l: Listing) => void;
  onDeleted: (id: string) => void;
}) {
  const { listing, chats, locked, session, onSaved, onDeleted } = props;
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(String(listing.price.amount));
  const [description, setDescription] = useState(listing.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0)
      return setError("Enter a price above zero.");
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/listings/${encodeURIComponent(listing.id)}`, {
        method: "PATCH",
        token: session.sessionToken,
        body: {
          title: title.trim(),
          description: description.trim(),
          price: { ...listing.price, amount },
        },
        schema: ListingDetailResponseSchema,
      });
      onSaved(res.listing);
      setMode("view");
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/listings/${encodeURIComponent(listing.id)}`, {
        method: "DELETE",
        token: session.sessionToken,
        schema: ListingDeleteResponseSchema,
      });
      onDeleted(listing.id);
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href={`/listings/${listing.id}`}
          className="aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2"
        >
          <ListingImage src={listing.imageUrl} title={listing.title} />
        </Link>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/listings/${listing.id}`}
              lang={listing.lang}
              className="font-medium break-words"
            >
              {listing.title}
            </Link>
            {listing.isDemo && <DemoBadge />}
          </div>
          <p className="agate font-semibold">
            {formatPrice(listing.price, listing.lang)}
          </p>
          <p className="meta">
            {chats === 0
              ? "No buyers yet"
              : chats === 1
                ? "1 buyer interested"
                : `${chats} buyers interested`}{" "}
            · Listed{" "}
            {new Date(listing.createdAt).toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "short", year: "numeric" },
            )}
          </p>
        </div>
        {!locked && mode === "view" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="btn btn-secondary"
            >
              Edit
            </button>
            {/* The server deletes a listing's chats, deals, Seals and help cases with it, so only empty listings can go. */}
            {chats === 0 && (
              <button
                type="button"
                onClick={() => setMode("delete")}
                className="btn btn-quiet text-danger"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "edit" && (
        <form
          onSubmit={save}
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="label">Title</span>
            <input
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Price ({listing.price.currency})</span>
            <input
              required
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="field w-48 max-w-full"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Description</span>
            <textarea
              required
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field"
            />
          </label>
          {error && (
            <p role="alert" className="note note-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="btn btn-primary"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("view")}
              className="btn btn-quiet"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <div
          role="alertdialog"
          aria-label="Delete this listing?"
          className="note note-error flex flex-wrap items-center justify-between gap-3"
        >
          <span>Delete this listing? This can&apos;t be undone.</span>
          <span className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={del}
              aria-busy={busy}
              className="btn btn-primary"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("view")}
              className="btn btn-quiet"
            >
              Keep it
            </button>
          </span>
          {error && <span className="basis-full">{error}</span>}
        </div>
      )}
    </li>
  );
}
