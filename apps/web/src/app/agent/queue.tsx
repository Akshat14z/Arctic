"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentQueueResponseSchema, CaseResponseSchema, type Case, type User } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { minutesText, reasonLabel } from "@/lib/cases";
import { LANGUAGES } from "@/lib/languages";
import { clearSession } from "@/lib/session";
import { useRequireAgent } from "@/lib/use-require-agent";

const POLL_MS = 5000; // D-011
const native = (u: User) => LANGUAGES.find((l) => l.code === u.language)?.native ?? u.language;

export function Queue() {
  const session = useRequireAgent();
  const router = useRouter();
  const token = session?.sessionToken;
  const [items, setItems] = useState<Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [, setTick] = useState(0); // re-renders "Waiting N min" on every poll

  useEffect(() => {
    if (!token) return;
    let live = true;
    const load = () =>
      api("/api/agent/queue", { token, schema: AgentQueueResponseSchema }).then(
        (r) => {
          if (!live) return;
          setItems(r.items);
          setError(null);
        },
        (e) => live && setError(friendlyMessage(e)),
      );
    load();
    const timer = setInterval(() => {
      load();
      setTick((n) => n + 1);
    }, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [token]);

  async function claim(c: Case) {
    if (!token) return;
    setClaiming(c.id);
    try {
      await api(`/api/cases/${encodeURIComponent(c.id)}/claim`, { method: "POST", token, schema: CaseResponseSchema });
      router.push(`/agent/cases/${encodeURIComponent(c.id)}`);
    } catch (e) {
      setError(friendlyMessage(e));
      setClaiming(null);
    }
  }

  if (!session) return <div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />;
  const me = session.user;
  const helps = me.agentLanguages ?? [me.language];
  const now = Date.now();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-muted">
            {me.displayName} · helps in{" "}
            {helps.map((c, i) => (
              <span key={c} lang={c}>
                {i > 0 && ", "}
                {LANGUAGES.find((l) => l.code === c)?.native}
              </span>
            ))}
          </p>
        </div>
        <button type="button" onClick={clearSession} className="min-h-tap text-sm text-muted underline">
          Sign out
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-danger">
          {error}
        </p>
      )}

      {!items && !error && (
        <ul aria-busy className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <li key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
          ))}
        </ul>
      )}

      {items?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6">
          <p className="font-medium">No one needs help right now.</p>
          <p className="text-muted">New requests appear here within a few seconds.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.map((c) => {
            const overdue = c.status === "open" && Date.parse(c.slaDueAt) < now;
            const matches = c.languages.every((l) => helps.includes(l));
            const mine = c.agent?.id === me.id;
            return (
              <li key={c.id} className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 ${overdue ? "border-danger" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{reasonLabel(c.reason)}</p>
                    <p className="text-sm text-muted">
                      {c.buyer.displayName} (<span lang={c.buyer.language}>{native(c.buyer)}</span>) ↔ {c.seller.displayName} (
                      <span lang={c.seller.language}>{native(c.seller)}</span>)
                    </p>
                  </div>
                  {matches && <span className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">Your languages</span>}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm ${overdue ? "font-medium text-danger" : "text-muted"}`}>
                    {c.status === "claimed"
                      ? `${mine ? "You" : c.agent?.displayName} · claimed`
                      : `Waiting ${minutesText(now - Date.parse(c.createdAt))}${overdue ? " · overdue" : ""}`}
                  </p>
                  {c.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => claim(c)}
                      disabled={claiming !== null}
                      className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
                    >
                      {claiming === c.id ? "Claiming…" : "Claim"}
                    </button>
                  ) : mine ? (
                    <Link href={`/agent/cases/${encodeURIComponent(c.id)}`} className="inline-flex min-h-tap items-center rounded-lg border border-brand px-4 font-medium">
                      Continue
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
