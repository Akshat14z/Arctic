"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseDetailResponseSchema, type Case, type LangCode, type User } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { LANGUAGES } from "@/lib/languages";
import { useRequireSession } from "@/lib/use-require-session";
import { ChatThread } from "@/components/chat-thread";
import { translator } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";

const POLL_MS = 5000; // D-011: polling in v0

type T = ReturnType<typeof translator>;

/** Where the request stands. Waiting is calm (neutral), never an alarm: the buyer is already anxious. */
function Status({ c, t }: { c: Case; t: T }) {
  if (c.status === "resolved") {
    return (
      <div role="status" className="note note-success">
        <p className="font-semibold">{t("case.resolved")}</p>
        {c.resolution && <p className="mt-1">{c.resolution}</p>}
      </div>
    );
  }
  if (c.status === "claimed" && c.agent) {
    return (
      <div role="status" className="note">
        <p className="font-semibold">{t("case.helping", { name: c.agent.displayName })}</p>
        <p className="meta mt-1">{t("case.helpingBody")}</p>
      </div>
    );
  }
  const minutes = Math.ceil((Date.parse(c.slaDueAt) - Date.now()) / 60_000);
  return (
    <div role="status" className="note flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
        <div>
          <p className="font-semibold">{t("case.waitingTitle")}</p>
          <p className="mt-0.5 text-ink-2">{minutes > 0 ? t("case.waitingSoon", { n: minutes }) : t("case.waitingLate")}</p>
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <p className="label mb-1.5">{t("case.whatHappens")}</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-2 marker:text-muted">
          <li>{t("case.step1")}</li>
          <li>{t("case.step2")}</li>
          <li>{t("case.step3")}</li>
        </ol>
      </div>
    </div>
  );
}

/** The deal both sides agreed to, frozen when help was requested: shown back so the buyer knows what the agent sees. */
function DealRecap({ c, lang, t }: { c: Case; lang: LangCode; t: T }) {
  const d = c.dealSnapshot;
  if (!d) return null;
  const item = d.item[lang] ?? d.item.en ?? Object.values(d.item)[0];
  return (
    <section aria-label={t("case.dealTitle")} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
      <div className="flex min-w-0 flex-col">
        <p className="label">{t("case.dealTitle")}</p>
        <p lang={lang} className="text-sm break-words">
          {item}
        </p>
        <p className="meta text-xs">{t("case.frozen")}</p>
      </div>
      <p className="agate text-xl font-semibold">{formatPrice(d.price, lang)}</p>
    </section>
  );
}

function Person({ user, role, me, t }: { user?: User; role: string; me: boolean; t: T }) {
  const lang = user && LANGUAGES.find((l) => l.code === user.language);
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-border py-2">
      <span className="min-w-0 break-words">
        {user ? user.displayName : t("case.joining")} {me && <span className="text-muted">{t("deal.you")}</span>}
        <span className="meta block">{role}</span>
      </span>
      {lang && (
        <span lang={lang.code} className="meta shrink-0">
          {t("case.reads", { lang: lang.native })}
        </span>
      )}
    </li>
  );
}

export function CaseView() {
  const { id } = useParams<{ id: string }>();
  const session = useRequireSession();
  const token = session?.sessionToken;
  const lang = session?.user.language ?? "en";
  const t = translator(lang);
  const [c, setCase] = useState<Case | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const resolved = c?.status === "resolved";

  useEffect(() => {
    if (!token || resolved) return;
    let live = true;
    const load = () =>
      api(`/api/cases/${encodeURIComponent(id)}`, { token, schema: CaseDetailResponseSchema }).then(
        (r) => {
          if (!live) return;
          setCase(r.case);
          setError(null);
        },
        (e) => live && setError({ text: friendlyMessage(e), notFound: e instanceof ApiError && (e.status === 404 || e.status === 403) }),
      );
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, token, attempt, resolved]);

  if (error && !c) {
    return (
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="page-title">{error.notFound ? "Help request not found" : "Couldn't open this help request"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/chats" className="btn btn-primary">
            Your chats
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !c) return <CaseSkeleton />;
  const me = session.user.id;

  return (
    <section className="-mt-4 -mb-24 flex min-h-[calc(100dvh-4rem)] flex-col md:-mb-8">
      <header className="sticky top-[var(--chrome-h)] z-10 flex items-center gap-3 border-b border-border bg-bg py-3">
        <Link href={`/chats/${encodeURIComponent(c.channelId)}`} aria-label={t("case.back")} className="btn btn-icon shrink-0">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.5 4l-6 6 6 6" strokeLinecap="square" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="item-title">{t("case.title")}</h1>
          <p className="meta break-words">{t(`help.reason.${c.reason}`)}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 pt-4">
        <Status c={c} t={t} />
        <DealRecap c={c} lang={lang} t={t} />
        {error && (
          <p role="status" className="text-sm text-muted">
            {t("case.refreshFailed")}
          </p>
        )}
        <details className="border-b border-border">
          <summary className="flex min-h-tap cursor-pointer items-center py-2.5">{t("case.people")}</summary>
          <ul className="border-t border-border">
            <Person user={c.buyer} role={t("case.buyer")} me={c.buyer.id === me} t={t} />
            <Person user={c.seller} role={t("case.seller")} me={c.seller.id === me} t={t} />
            <Person user={c.agent} role={t("case.support")} me={c.agent?.id === me} t={t} />
          </ul>
        </details>
      </div>

      <ChatThread
          session={session}
          channel={{ type: "group", id: c.groupChannelId }}
          channelId={c.groupChannelId}
          emptyText={t("case.empty")}
          closedText={resolved ? t("case.closed") : undefined}
        />
    </section>
  );
}

/** Loading: header, status strip and thread, ruled. */
export function CaseSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the help request" className="flex flex-col gap-4">
      <div className="skeleton h-12" />
      <div className="skeleton h-20" />
      <div className="skeleton h-48" />
    </div>
  );
}
