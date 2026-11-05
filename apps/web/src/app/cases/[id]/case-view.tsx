"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseDetailResponseSchema, type Case, type User } from "@convocart/contracts";
import { api, ApiError, friendlyMessage } from "@/lib/api/client";
import { LANGUAGES } from "@/lib/languages";
import { useRequireSession } from "@/lib/use-require-session";
import { ChatThread } from "@/components/chat-thread";

const POLL_MS = 5000; // D-011: polling in v0

function Status({ c }: { c: Case }) {
  if (c.status === "resolved") {
    return (
      <div className="rounded-xl bg-success-bg p-4 text-success">
        <p className="font-semibold">Resolved</p>
        {c.resolution && <p className="mt-1 text-text">{c.resolution}</p>}
      </div>
    );
  }
  if (c.status === "claimed" && c.agent) {
    return (
      <div className="rounded-xl border border-brand bg-surface p-4">
        <p className="font-semibold">{c.agent.displayName} from Handshake support is helping</p>
        <p className="mt-1 text-sm text-muted">They can read everything in this chat, in every language.</p>
      </div>
    );
  }
  const minutes = Math.ceil((Date.parse(c.slaDueAt) - Date.now()) / 60_000);
  return (
    <div className="rounded-xl bg-guard-bg p-4 text-guard">
      <p className="font-semibold">An agent is on the way</p>
      <p className="mt-1 text-sm">
        {minutes > 0
          ? `Usually within ${minutes} minute${minutes === 1 ? "" : "s"}. You can keep writing here meanwhile.`
          : "This is taking longer than usual. We haven't forgotten you."}
      </p>
    </div>
  );
}

function Person({ user, role, me }: { user?: User; role: string; me: boolean }) {
  const lang = user && LANGUAGES.find((l) => l.code === user.language);
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="truncate">
        {user ? user.displayName : "Joining soon…"} {me && <span className="text-muted">(you)</span>}
        <span className="block text-xs text-muted">{role}</span>
      </span>
      {lang && (
        <span lang={lang.code} className="shrink-0 text-sm text-muted">
          reads {lang.native}
        </span>
      )}
    </li>
  );
}

export function CaseView() {
  const { id } = useParams<{ id: string }>();
  const session = useRequireSession();
  const token = session?.sessionToken;
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
        <h1 className="text-2xl font-semibold">{error.notFound ? "Help request not found" : "Couldn't open this help request"}</h1>
        <p className="text-muted">{error.text}</p>
        {error.notFound ? (
          <Link href="/chats" className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Your chats
          </Link>
        ) : (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg">
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!session || !c) return <div aria-busy className="h-72 animate-pulse rounded-xl bg-surface" />;
  const me = session.user.id;

  return (
    <section className="-my-6 flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg py-3">
        <Link
          href={`/chats/${encodeURIComponent(c.channelId)}`}
          aria-label="Back to the chat"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-lg text-xl"
        >
          ‹
        </Link>
        <h1 className="font-semibold">Help request</h1>
      </header>

      <div className="flex flex-col gap-3 pt-4">
        <Status c={c} />
        {error && (
          <p role="status" className="text-sm text-muted">
            Couldn&apos;t refresh the status. Retrying…
          </p>
        )}
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="min-h-6 cursor-pointer font-medium">Who&apos;s in this chat</summary>
          <ul className="mt-3 flex flex-col gap-2">
            <Person user={c.buyer} role="Buyer" me={c.buyer.id === me} />
            <Person user={c.seller} role="Seller" me={c.seller.id === me} />
            <Person user={c.agent} role="Handshake support" me={c.agent?.id === me} />
          </ul>
          <p className="mt-3 text-xs text-muted">Everyone reads every message in their own language.</p>
        </details>
      </div>

      <ChatThread
          session={session}
          channel={{ type: "group", id: c.groupChannelId }}
          channelId={c.groupChannelId}
          emptyText="Tell the agent what happened. They'll see your earlier chat too."
          closedText={resolved ? "This help request is resolved. Go back to the chat to keep talking." : undefined}
        />
    </section>
  );
}
