"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentQueueResponseSchema, CaseResponseSchema, type Case, type User } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { minutesText, reasonLabel } from "@/lib/cases";
import { LANGUAGES } from "@/lib/languages";
import { localeFor } from "@/lib/format";
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
  const [view, setView] = useState<"all" | "open" | "mine">("all");

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

  if (!session) return <div aria-busy className="skeleton h-72" />;
  const me = session.user;
  const helps = me.agentLanguages ?? [me.language];
  const now = Date.now();
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(localeFor(session?.user.language ?? "en"), { hour: "numeric", minute: "2-digit" });
  const th = "py-2 pr-4 text-left align-bottom font-medium";
  const td = "py-3 pr-4 align-top max-md:py-0.5 max-md:pr-0";

  return (
    <section data-wide className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Dispatch</h1>
          <p className="meta">
            <span>{me.displayName}</span>
            <br />
            helps in{" "}
            {helps.map((c, i) => (
              <span key={c} lang={c}>
                {i > 0 && ", "}
                {LANGUAGES.find((l) => l.code === c)?.native}
              </span>
            ))}
          </p>
        </div>
      </header>

      {items && (
        <div data-stagger className="grid grid-cols-3 gap-3">
          {(
            [
              ["Open", items.filter((c) => c.status === "open").length],
              ["Overdue", items.filter((c) => c.status === "open" && Date.parse(c.slaDueAt) < now).length],
              ["Yours", items.filter((c) => c.agent?.id === me.id).length],
            ] as const
          ).map(([label, n], i) => (
            <div key={label} className={`tile gap-2 ${i === 0 ? "tile-hero" : ""}`}>
              <p className="text-sm font-medium">{label}</p>
              <p className="figure">{n}</p>
            </div>
          ))}
        </div>
      )}

      {items && items.length > 0 && (
        <div role="group" aria-label="Show" className="seg self-start">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["mine", "Yours"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="note note-error">
          {error}
        </p>
      )}

      {!items && !error && (
        <ul aria-busy className="flex flex-col gap-px">
          {[0, 1, 2].map((i) => (
            <li key={i} className="skeleton h-14" />
          ))}
        </ul>
      )}

      {items?.length === 0 && (
        <div className="well flex flex-col gap-1 px-4 py-6">
          <p className="item-title">No one needs help right now.</p>
          <p className="meta">New requests appear here within a few seconds.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <table className="w-full border-collapse border-y border-border max-md:block">
          <thead className="meta border-b border-border max-md:sr-only">
            <tr>
              <th scope="col" className={th}>Buyer</th>
              <th scope="col" className={th}>Seller</th>
              <th scope="col" className={th}>Languages</th>
              <th scope="col" className={th}>Reason</th>
              <th scope="col" className={th}>Opened</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={`${th} pr-0`}>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody aria-live="polite" className="max-md:block">
            {items.filter((c) => view === "all" || (view === "open" ? c.status === "open" : c.agent?.id === me.id)).map((c) => {
              const overdue = c.status === "open" && Date.parse(c.slaDueAt) < now;
              const matches = c.languages.every((l) => helps.includes(l));
              const mine = c.agent?.id === me.id;
              return (
                <tr key={c.id} className="border-b border-border last:border-b-0 max-md:flex max-md:flex-col max-md:py-3">
                  <td className={`${td} max-md:order-2`}>
                    {c.buyer.displayName}{" "}
                    <span lang={c.buyer.language} className="meta">
                      {native(c.buyer)}
                    </span>
                  </td>
                  <td className={`${td} max-md:order-3`}>
                    {c.seller.displayName}{" "}
                    <span lang={c.seller.language} className="meta">
                      {native(c.seller)}
                    </span>
                  </td>
                  <td className={`${td} max-md:order-4`}>
                    <span className="meta">
                      {c.languages.map((l, i) => (
                        <span key={l} lang={l}>
                          {i > 0 && ", "}
                          {LANGUAGES.find((x) => x.code === l)?.native ?? l}
                        </span>
                      ))}
                    </span>
                    {matches && <span className="block text-sm text-muted">Your languages</span>}
                  </td>
                  <td className={`${td} font-medium max-md:order-1`}>{reasonLabel(c.reason)}</td>
                  <td className={`${td} max-md:order-5`}>
                    <span className="agate text-sm">{clock(c.createdAt)}</span>
                    {c.status === "open" && (
                      <span className="block text-sm text-muted">
                        Waiting <span className="agate">{minutesText(now - Date.parse(c.createdAt))}</span>
                      </span>
                    )}
                  </td>
                  <td className={`${td} text-sm max-md:order-6`}>
                    {c.status === "claimed" ? (
                      <span className="text-muted">{mine ? "You" : c.agent?.displayName}, claimed</span>
                    ) : overdue ? (
                      <span className="font-medium text-danger">Overdue</span>
                    ) : (
                      <span className="text-muted">Open</span>
                    )}
                  </td>
                  <td className={`${td} pr-0 text-right max-md:order-7 max-md:pt-2 max-md:text-left`}>
                    {c.status === "open" ? (
                      <button type="button" onClick={() => claim(c)} disabled={claiming !== null} aria-busy={claiming === c.id} className="btn btn-secondary">
                        {claiming === c.id ? "Claiming…" : "Claim"}
                      </button>
                    ) : mine ? (
                      <Link href={`/agent/cases/${encodeURIComponent(c.id)}`} className="btn btn-secondary">
                        Continue
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
