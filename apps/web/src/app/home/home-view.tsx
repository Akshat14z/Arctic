"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatListResponseSchema, ListingListResponseSchema, type ChatSummary, type Listing } from "@convocart/contracts";
import { Icon } from "@/components/icons";
import { api, friendlyMessage } from "@/lib/api/client";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES } from "@/lib/languages";
import { useRequireSession } from "@/lib/use-require-session";
import { translator } from "@/lib/i18n";
import { ListingCard } from "@/components/listing-card";

/** A tile's round ↗ (the whole tile's destination, named for screen readers). */
function Go({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="tile-go">
      <Icon name="go" />
    </Link>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase();

export function HomeView() {
  const session = useRequireSession();
  const router = useRouter();
  const token = session?.sessionToken;
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [market, setMarket] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (session?.user.role === "agent") router.replace("/agent");
  }, [session, router]);

  useEffect(() => {
    if (!token || !session) return;
    let live = true;
    setError(null);
    // Two independent loads, so each tile fills as soon as its own data lands.
    api("/api/chats", { token, schema: ChatListResponseSchema }).then(
      (c) => live && setChats(c.items),
      (e) => live && setError(friendlyMessage(e)),
    );
    // ponytail: first page only; a seller with more listings than one page sees the newest. Add ?sellerId= server-side if that matters.
    api("/api/listings", { token, schema: ListingListResponseSchema }).then(
      (l) => {
        if (!live) return;
        setMine(l.items.filter((x) => x.sellerId === session.user.id));
        setMarket(l.items.filter((x) => x.sellerId !== session.user.id).slice(0, 4));
      },
      () => {
        if (!live) return;
        setMine([]);
        setMarket([]);
      },
    );
    return () => {
      live = false;
    };
  }, [token, session, attempt]);

  if (!session) return <div aria-busy className="skeleton h-72" />;
  const { user } = session;
  const lang = user.language;
  const native = LANGUAGES.find((l) => l.code === lang)?.native ?? lang;
  const t = translator(lang);
  const latest = chats?.[0];
  const loading = !chats && !error;
  const loadingMine = !mine && !error;

  return (
    <section data-wide className="flex flex-col gap-8">
      <section className="home-campaign" aria-labelledby="home-campaign-title">
        <div className="home-campaign-copy">
          <p className="eyebrow">CommonGrounds marketplace</p>
          <h1 id="home-campaign-title">{t("home.hi", { name: user.displayName.split(" ")[0] })}</h1>
          <p>Find the right item, follow sellers you trust, and agree on every detail in your own language.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/listings" className="btn btn-primary">Browse new listings</Link>
            <Link href="/listings/new" className="btn btn-secondary">List an item</Link>
          </div>
        </div>
        <aside className="home-campaign-aside">
          <div>
            <p className="eyebrow">Marketplace update</p>
            <h2 className="mt-2 text-2xl font-semibold">Your seller network, in one feed.</h2>
            <p className="home-campaign-aside-copy mt-3 text-sm">Search sellers, follow their storefronts, and see their newest listings chronologically.</p>
          </div>
          <Link href="/following" className="btn btn-secondary self-start">Explore following</Link>
        </aside>
      </section>

      {error && (
        <div role="alert" className="note note-error flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet shrink-0">
            {t("common.tryAgain")}
          </button>
        </div>
      )}

      {market && market.length > 0 && (
        <section className="home-discovery" aria-labelledby="home-discovery-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">Fresh from the marketplace</p><h2 id="home-discovery-title" className="section-title mt-1">New listings worth a look</h2></div>
            <Link href="/listings" className="link text-sm font-medium">Shop all listings</Link>
          </div>
          <div className="home-discovery-grid">
            {market.map((listing) => <ListingCard key={listing.id} listing={listing} lang={lang} />)}
          </div>
        </section>
      )}

      {!market && !error && <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-hidden>{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton aspect-[4/5]" />)}</div>}

      <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Your workspace</p><h2 className="section-title mt-1">Pick up where you left off</h2></div></div>
      <div data-stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {/* Hero: pick up where you left off, or find something */}
        {loading ? (
          <div className="skeleton h-56 sm:col-span-2" />
        ) : latest ? (
          <article className="tile min-h-56 justify-between border-accent sm:col-span-2">
            <div>
              <h2 className="tile-title">{t("home.continue", { name: latest.otherUser.displayName })}</h2>
              <p lang={latest.listing.lang} className="meta break-words">
                {latest.listing.title}
              </p>
            </div>
            <p className="figure">{formatPrice(latest.listing.price, lang)}</p>
            {latest.lastMessage && <p className="line-clamp-2 text-sm break-words">{latest.lastMessage.text}</p>}
            <Go href={`/chats/${encodeURIComponent(latest.channelId)}`} label={t("home.openChat", { name: latest.otherUser.displayName })} />
          </article>
        ) : (
          <article className="tile min-h-56 justify-between border-accent sm:col-span-2">
            <div>
              <h2 className="tile-title">{t("home.find")}</h2>
              <p className="meta">{t("home.findBody", { lang: native })}</p>
            </div>
            <Link href="/listings" className="btn btn-primary self-start">
              {t("home.browse")}
            </Link>
            <Go href="/listings" label={t("home.browse")} />
          </article>
        )}

        {/* What makes this work: your language */}
        <article className="tile justify-between">
          <h2 className="tile-title">{t("home.readIn")}</h2>
          <p lang={lang} className="figure">
            {native}
          </p>
          <p className="meta">{t("home.readInBody", { lang: native })}</p>
        </article>

        {/* Chats */}
        <article className="tile sm:col-span-2">
          <h2 className="tile-title">{t("nav.chats")}</h2>
          <Go href="/chats" label={t("home.allChats")} />
          {loading ? (
            <div className="skeleton h-32" />
          ) : chats && chats.length > 0 ? (
            <ul>
              {chats.slice(0, 4).map((c) => (
                <li key={c.channelId}>
                  <Link href={`/chats/${encodeURIComponent(c.channelId)}`} className="row">
                    <span className="row-icon" aria-hidden>
                      {initial(c.otherUser.displayName)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="row-title">{c.otherUser.displayName}</span>
                      <span className="meta line-clamp-2 break-words">{c.lastMessage?.text ?? c.listing.title}</span>
                    </span>
                    {c.lastMessage && (
                      <time dateTime={c.lastMessage.at} className="meta shrink-0">
                        {new Date(c.lastMessage.at).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
                      </time>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">{t("home.noChats")}</p>
          )}
        </article>

        {/* Your listings, or the way to start one */}
        <article className="tile">
          <h2 className="tile-title">{t("home.listings")}</h2>
          <Go href="/selling" label={t("home.dashboard")} />
          {loadingMine ? (
            <div className="skeleton h-24" />
          ) : mine && mine.length > 0 ? (
            <ul>
              {mine.slice(0, 3).map((l) => (
                <li key={l.id}>
                  <Link href={`/listings/${l.id}`} className="row">
                    <span lang={l.lang} className="row-title min-w-0 flex-1">
                      {l.title}
                    </span>
                    <span className="agate shrink-0">{formatPrice(l.price, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="meta">{t("home.writeIn", { lang: native })}</p>
              <Link href="/listings/new" className="btn btn-secondary mt-auto self-start">
                {t("browse.sell")}
              </Link>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
