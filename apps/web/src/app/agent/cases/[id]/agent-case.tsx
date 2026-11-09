"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CaseDetailResponseSchema,
  CaseResponseSchema,
  type CaseDetailResponse,
  type Deal,
  type LangCode,
  type User,
} from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { reasonLabel } from "@/lib/cases";
import { formatPrice, localeFor } from "@/lib/format";
import { LANGUAGES } from "@/lib/languages";
import { useRequireAgent } from "@/lib/use-require-agent";
import { ChatThread } from "@/components/chat-thread";

const langName = (code: LangCode) => LANGUAGES.find((l) => l.code === code)?.native ?? code;

function DealCard({ deal, lang }: { deal: Deal; lang: LangCode }) {
  const pick = <T,>(r: Partial<Record<LangCode, T>>) => r[lang] ?? r.en ?? Object.values(r)[0];
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(localeFor(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "not yet");
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4">
      <h2 className="item-title">Agreed deal</h2>
      <p className="meta">Frozen when the case opened</p>
      <p>{pick(deal.item)}</p>
      <p className="agate text-xl">
        {formatPrice(deal.price, lang)}
        {deal.quantity > 1 && <span className="text-sm text-muted"> × {deal.quantity}</span>}
      </p>
      {deal.delivery && (
        <p className="meta">
          {deal.delivery.method === "pickup" ? "Pickup" : "Shipping"}
          {deal.delivery.date && <>, <span className="agate">{deal.delivery.date}</span></>}
        </p>
      )}
      {(pick(deal.conditions) ?? []).length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {pick(deal.conditions)?.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
      <p className="meta">
        Buyer agreed <span className="agate">{when(deal.agreedBy.buyer)}</span>
        <br />
        Seller agreed <span className="agate">{when(deal.agreedBy.seller)}</span>
      </p>
    </section>
  );
}

function Transcript({ detail, lang }: { detail: CaseDetailResponse; lang: LangCode }) {
  const [view, setView] = useState<"mine" | "saw">("mine");
  const { case: c, transcript } = detail;
  const people: User[] = [c.buyer, c.seller];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.displayName ?? "Someone";
  const time = (iso: string) => new Date(iso).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });
  const cols = "grid gap-x-6 gap-y-1 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="section-title">Conversation before the case</h2>
        <div role="group" aria-label="Transcript view" className="grid w-full grid-cols-2 gap-1 rounded-full border border-border bg-surface p-1 sm:inline-grid sm:w-auto">
          {(
            [
              ["mine", "In my language"],
              ["saw", "What each side saw"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`btn px-3 text-sm ${view === v ? "bg-accent font-medium text-[var(--color-accent-ink)]" : "text-muted hover:text-text"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {transcript.length === 0 ? (
        <p className="meta border-y border-border py-6">No messages recorded yet.</p>
      ) : (
        <div className="border-y border-border">
          <div aria-hidden className={`${cols} meta border-b border-border py-2 max-md:hidden`}>
            <span />
            {view === "mine" ? (
              <>
                <span>Original</span>
                <span lang={lang}>{langName(lang)}</span>
              </>
            ) : (
              people.map((p) => <span key={p.id}>{p.displayName} saw</span>)
            )}
          </div>
          <ol className="flex flex-col">
            {transcript.map((t) => (
              <li key={t.at + t.from} className={`${cols} border-b border-border py-3 last:border-b-0`}>
                <p className="flex flex-col text-sm">
                  <span className="font-medium">{nameOf(t.from)}</span>
                  <span className="agate text-muted">{time(t.at)}</span>
                  <span className="text-muted">
                    wrote in <span lang={t.orig.lang}>{langName(t.orig.lang)}</span>
                  </span>
                </p>
                {view === "mine" ? (
                  <>
                    <p lang={t.orig.lang} className={t.orig.lang === lang ? "md:col-span-2" : "text-muted"}>
                      {t.orig.text}
                    </p>
                    {t.orig.lang !== lang && <p lang={t.tr[lang] ? lang : t.orig.lang}>{t.tr[lang] ?? t.orig.text}</p>}
                  </>
                ) : (
                  people.map((p) => {
                    const saw = t.shownTo[p.id];
                    return (
                      <p key={p.id} className="flex flex-col md:border-l md:border-border md:pl-3">
                        <span className="meta md:sr-only">{p.displayName} saw: </span>
                        {saw ? (
                          <>
                            <span lang={saw.lang}>{saw.text}</span>
                            <span className="meta"> ({saw.translated ? `translated to ${langName(saw.lang)}` : "original"})</span>
                          </>
                        ) : (
                          <span className="text-muted">not recorded</span>
                        )}
                      </p>
                    );
                  })
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function AgentCase() {
  const { id } = useParams<{ id: string }>();
  const session = useRequireAgent();
  const token = session?.sessionToken;
  const [detail, setDetail] = useState<CaseDetailResponse | null>(null);
  const [error, setError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let live = true;
    api(`/api/cases/${encodeURIComponent(id)}`, { token, schema: CaseDetailResponseSchema }).then(
      (d) => live && setDetail(d),
      (e) => live && setError({ text: friendlyMessage(e), notFound: e instanceof ApiError && e.status === 404 }),
    );
    return () => {
      live = false;
    };
  }, [id, token, attempt]);

  async function act(action: "claim" | "resolve") {
    if (!token || !detail || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const { case: updated } = await api(`/api/cases/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        token,
        body: action === "resolve" ? { resolution: resolution.trim() } : undefined,
        schema: CaseResponseSchema,
      });
      setDetail({ ...detail, case: updated });
    } catch (e) {
      setActionError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <section className="flex flex-1 flex-col items-start justify-center gap-4">
        <h1 className="page-title">{error.notFound ? "Case not found" : "Couldn't open this case"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/agent" className="btn btn-primary">
            Back to dispatch
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !detail) return <div aria-busy className="skeleton h-72" />;
  const { case: c, summary } = detail;
  const lang = session.user.language;
  const mine = c.agent?.id === session.user.id;
  const deal = c.dealSnapshot ?? summary.deal;

  return (
    <section data-wide className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-3 border-b border-border pb-4">
        <Link href="/agent" aria-label="Back to dispatch" className="btn btn-icon">
          <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="page-title">{reasonLabel(c.reason)}</h1>
          <p className="meta">
            {c.buyer.displayName} (<span lang={c.buyer.language}>{langName(c.buyer.language)}</span>) ↔ {c.seller.displayName} (
            <span lang={c.seller.language}>{langName(c.seller.language)}</span>)
          </p>
          <p className="text-sm font-medium">{c.status === "resolved" ? "Resolved" : c.status === "claimed" ? (mine ? "Yours" : `Claimed by ${c.agent?.displayName}`) : "Open"}</p>
        </div>
        {c.status === "open" && (
          <button type="button" onClick={() => act("claim")} disabled={busy} aria-busy={busy} className="btn btn-primary max-sm:w-full">
            Claim this case
          </button>
        )}
      </header>

      {actionError && (
        <p role="alert" className="note note-error">
          {actionError}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="lg:col-start-1 lg:row-start-1">
          <Transcript detail={detail} lang={lang} />
        </div>

        <aside className="well flex flex-col gap-4 px-4 py-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <section className="flex flex-col gap-2">
            <h2 className="item-title">Summary</h2>
            {summary.text ? (
              <>
                <p lang={summary.lang}>{summary.text}</p>
                {summary.keyFacts.length > 0 && (
                  <ul className="list-disc pl-5 text-sm [overflow-wrap:anywhere]">
                    {summary.keyFacts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="meta">The AI summary appears here once the conversation has been recorded.</p>
            )}
          </section>

          {deal ? <DealCard deal={deal} lang={lang} /> : <p className="meta border-t border-border pt-4">No agreed deal in this chat.</p>}

          {c.status === "resolved" ? (
            <div className="note note-success">
              <p className="font-medium text-success">Resolved</p>
              <p className="mt-1">{c.resolution}</p>
            </div>
          ) : (
            mine && (
              <form
                className="flex flex-col gap-2 border-t border-border pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  act("resolve");
                }}
              >
                <label className="flex flex-col gap-2">
                  <span className="label">Resolution</span>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="What was decided, in a sentence both sides will understand"
                    className="field"
                  />
                </label>
                <button type="submit" disabled={!resolution.trim() || busy} aria-busy={busy} className="btn btn-primary self-start">
                  {busy ? "Saving…" : "Mark resolved"}
                </button>
              </form>
            )
          )}
        </aside>

        <section className="flex min-h-96 flex-col border-t border-border pt-4 lg:col-start-1 lg:row-start-2 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto">
          <h2 className="section-title">Chat with both sides</h2>
          {!mine && c.status !== "resolved" ? (
            <p className="meta m-auto max-w-xs py-8 text-center">Claim the case to join the chat.</p>
          ) : (
            <ChatThread
              session={session}
              channel={{ type: "group", id: c.groupChannelId }}
              channelId={c.groupChannelId}
              emptyText="Introduce yourself. Both sides read you in their own language."
              closedText={c.status === "resolved" ? "This case is resolved." : undefined}
            />
          )}
        </section>
      </div>
    </section>
  );
}
