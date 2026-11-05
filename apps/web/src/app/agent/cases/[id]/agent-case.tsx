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

const card = "rounded-xl border border-border bg-surface p-4";
const langName = (code: LangCode) => LANGUAGES.find((l) => l.code === code)?.native ?? code;

function DealCard({ deal, lang }: { deal: Deal; lang: LangCode }) {
  const pick = <T,>(r: Partial<Record<LangCode, T>>) => r[lang] ?? r.en ?? Object.values(r)[0];
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(localeFor(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "not yet");
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Agreed deal</h2>
        <span className="text-xs text-muted">Frozen when the case opened</span>
      </div>
      <p className="mt-2">{pick(deal.item)}</p>
      <p className="text-lg font-semibold">
        {formatPrice(deal.price, lang)}
        {deal.quantity > 1 && <span className="text-sm font-normal text-muted"> × {deal.quantity}</span>}
      </p>
      {deal.delivery && <p className="text-sm text-muted">{deal.delivery.method === "pickup" ? "Pickup" : "Shipping"}{deal.delivery.date && ` · ${deal.delivery.date}`}</p>}
      {(pick(deal.conditions) ?? []).length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {pick(deal.conditions)?.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">
        Buyer agreed {when(deal.agreedBy.buyer)} · Seller agreed {when(deal.agreedBy.seller)}
      </p>
    </div>
  );
}

function Transcript({ detail, lang }: { detail: CaseDetailResponse; lang: LangCode }) {
  const [view, setView] = useState<"mine" | "saw">("mine");
  const { case: c, transcript } = detail;
  const people: User[] = [c.buyer, c.seller];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.displayName ?? "Someone";
  const time = (iso: string) => new Date(iso).toLocaleTimeString(localeFor(lang), { hour: "numeric", minute: "2-digit" });

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Conversation before the case</h2>
        <div role="group" aria-label="Transcript view" className="flex rounded-lg border border-border text-sm">
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
              className={`min-h-tap rounded-lg px-3 ${view === v ? "bg-brand text-brand-fg" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {transcript.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No messages recorded yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {transcript.map((t) => (
            <li key={t.at + t.from} className="flex flex-col gap-1">
              <p className="text-xs text-muted">
                {nameOf(t.from)} · {time(t.at)} · wrote in <span lang={t.orig.lang}>{langName(t.orig.lang)}</span>
              </p>
              {view === "mine" ? (
                <p lang={t.tr[lang] && t.orig.lang !== lang ? lang : t.orig.lang}>{t.orig.lang === lang ? t.orig.text : (t.tr[lang] ?? t.orig.text)}</p>
              ) : (
                <ul className="flex flex-col gap-1 border-l-2 border-border pl-3">
                  {people.map((p) => {
                    const saw = t.shownTo[p.id];
                    return (
                      <li key={p.id} className="text-sm">
                        <span className="text-muted">{p.displayName} saw: </span>
                        {saw ? (
                          <>
                            <span lang={saw.lang}>{saw.text}</span>
                            <span className="text-xs text-muted"> ({saw.translated ? `translated to ${langName(saw.lang)}` : "original"})</span>
                          </>
                        ) : (
                          <span className="text-muted">not recorded</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
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
        <h1 className="text-2xl font-semibold">{error.notFound ? "Case not found" : "Couldn't open this case"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/agent" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Back to dispatch
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !detail) return <div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />;
  const { case: c, summary } = detail;
  const lang = session.user.language;
  const mine = c.agent?.id === session.user.id;
  const deal = c.dealSnapshot ?? summary.deal;

  return (
    <section data-wide className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/agent" aria-label="Back to dispatch" className="flex min-h-tap min-w-tap items-center justify-center rounded-lg text-xl">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{reasonLabel(c.reason)}</h1>
          <p className="text-sm text-muted">
            {c.buyer.displayName} (<span lang={c.buyer.language}>{langName(c.buyer.language)}</span>) ↔ {c.seller.displayName} (
            <span lang={c.seller.language}>{langName(c.seller.language)}</span>) · {c.status === "resolved" ? "Resolved" : c.status === "claimed" ? (mine ? "Yours" : `Claimed by ${c.agent?.displayName}`) : "Open"}
          </p>
        </div>
        {c.status === "open" && (
          <button type="button" onClick={() => act("claim")} disabled={busy} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50">
            Claim this case
          </button>
        )}
      </header>

      {actionError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-danger">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className={card}>
            <h2 className="font-semibold">Summary</h2>
            {summary.text ? (
              <>
                <p lang={summary.lang} className="mt-2">
                  {summary.text}
                </p>
                {summary.keyFacts.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {summary.keyFacts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">The AI summary appears here once the conversation has been recorded.</p>
            )}
          </div>

          {deal ? <DealCard deal={deal} lang={lang} /> : <p className={`${card} text-sm text-muted`}>No agreed deal in this chat.</p>}

          <Transcript detail={detail} lang={lang} />

          {c.status === "resolved" ? (
            <div className="rounded-xl bg-success-bg p-4 text-success">
              <p className="font-semibold">Resolved</p>
              <p className="mt-1 text-text">{c.resolution}</p>
            </div>
          ) : (
            mine && (
              <form
                className={`${card} flex flex-col gap-2`}
                onSubmit={(e) => {
                  e.preventDefault();
                  act("resolve");
                }}
              >
                <label className="flex flex-col gap-2">
                  <span className="font-semibold">Resolution</span>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="What was decided, in a sentence both sides will understand"
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-base"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!resolution.trim() || busy}
                  className="min-h-tap self-start rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Mark resolved"}
                </button>
              </form>
            )
          )}
        </div>

        <div className={`${card} flex min-h-96 flex-col lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto`}>
          <h2 className="font-semibold">Chat with both sides</h2>
          {!mine && c.status !== "resolved" ? (
            <p className="m-auto max-w-xs py-8 text-center text-sm text-muted">Claim the case to join the chat.</p>
          ) : (
            <ChatThread
              session={session}
              channel={{ type: "group", id: c.groupChannelId }}
              channelId={c.groupChannelId}
              emptyText="Introduce yourself. Both sides read you in their own language."
              closedText={c.status === "resolved" ? "This case is resolved." : undefined}
            />
          )}
        </div>
      </div>
    </section>
  );
}
