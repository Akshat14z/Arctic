"use client";

import { useEffect, useRef, useState } from "react";
import {
  DealAgreeResponseSchema,
  ExtractDealResponseSchema,
  type AuthResponse,
  type Deal,
  type HandshakeExtraV1,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { ensureConnected, useConnectionState } from "@/lib/chat-connection";
import { loadHistory, onMessages, sameChannel, sendText, type ChannelRef, type ChatMessage } from "@/lib/nexconn";
import { parseExtra } from "@/lib/render";
import { Composer } from "./composer";
import { DealCard, dealSummary, type DealRole } from "./deal-card";
import { MessageBubble } from "./message-bubble";

/** Adds messages, dropping duplicates (history reloads, our own echo), oldest first. */
function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}

type Props = {
  session: AuthResponse;
  channel: ChannelRef;
  /** Our channel id, sent to /prepare so the server knows whose languages to translate into. */
  channelId: string;
  emptyText: string;
  /** Set when sending isn't allowed (e.g. a resolved case); shown in place of the composer. */
  closedText?: string;
  /** Deal Cards: who I am in this deal, and both names. Omit `myRole` for read-only (agents). */
  deals?: { myRole?: DealRole; names: Record<DealRole, string>; canPropose: boolean };
};

/** Messages, history, live updates and the composer for one Nexconn channel. */
export function ChatThread({ session, channel, channelId, emptyText, closedText, deals }: Props) {
  const state = useConnectionState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lang = session.user.language;

  // Connect once per page load. `session` is left out on purpose: ensureConnected saves a refreshed
  // session, which would re-run this.
  useEffect(() => {
    ensureConnected(session).catch((e) => setError(friendlyMessage(e)));
  }, [channel.type, channel.id]);

  // History whenever we (re)connect, so a reconnect catches up; live messages for this channel.
  useEffect(() => {
    if (state !== "connected") return;
    let live = true;
    setError(null);
    loadHistory(channel).then(
      (h) => live && setMessages((m) => merge(m, h)),
      () => live && setError("We couldn't load earlier messages."),
    );
    const off = onMessages((incoming) => setMessages((m) => merge(m, incoming.filter((x) => sameChannel(x.channel, channel)))));
    return () => {
      live = false;
      off();
    };
    // Keyed on the channel's type + id (not the object) so a new-but-equal ref doesn't resubscribe.
  }, [channel.type, channel.id, state]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" }); // braces: scroll methods may return a Promise, effects must not
  }, [messages.length]);

  /** A deal travels as a C4 `deal_card` message; every new version (agreements) is a new message. */
  async function sendDeal(deal: Deal) {
    const text = dealSummary(deal, lang);
    const extra: HandshakeExtraV1 = { v: 1, kind: "deal_card", orig: { lang, text }, tr: {}, deal };
    const sent = await sendText(channel, text, JSON.stringify(extra));
    setMessages((list) => merge(list, [sent]));
  }

  async function propose() {
    setProposing(true);
    setError(null);
    try {
      const { deal } = await api("/api/deals/extract", {
        method: "POST",
        body: { channelId },
        token: session.sessionToken,
        schema: ExtractDealResponseSchema,
      });
      if (deal) await sendDeal(deal);
      else setError("We couldn't find deal terms in this chat yet. Agree on a price first.");
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setProposing(false);
    }
  }

  async function agree(deal: Deal) {
    const { deal: updated } = await api(`/api/deals/${encodeURIComponent(deal.id)}/agree`, {
      method: "POST",
      token: session.sessionToken,
      schema: DealAgreeResponseSchema,
    });
    await sendDeal(updated);
  }

  // Only the newest message of each deal is shown, so agreements update one card instead of stacking.
  const latestDealMessage = new Map<string, string>();
  for (const m of messages) {
    const d = parseExtra(m.extra);
    if (d?.kind === "deal_card" && d.deal) latestDealMessage.set(d.deal.id, m.id);
  }

  return (
    <>
      {state !== "connected" && (
        <p role="status" className="mt-3 rounded-lg bg-guard-bg px-3 py-2 text-sm text-guard">
          {state === "disconnected" ? "Chat is offline. Reconnecting…" : "Connecting to chat…"}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3 py-4" aria-live="polite">
        {messages.length === 0 && state === "connected" && !error && (
          <p className="m-auto max-w-xs text-center text-sm text-muted">{emptyText}</p>
        )}
        {messages.map((m) => {
          const d = parseExtra(m.extra);
          if (d?.kind === "deal_card" && d.deal) {
            if (latestDealMessage.get(d.deal.id) !== m.id) return null;
            return deals ? (
              <DealCard key={m.id} deal={d.deal} lang={lang} myRole={deals.myRole} names={deals.names} onAgree={deals.myRole ? agree : undefined} />
            ) : (
              <MessageBubble key={m.id} message={m} lang={lang} />
            );
          }
          return <MessageBubble key={m.id} message={m} lang={lang} />;
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-bg pb-4">
        {closedText ? (
          <p className="border-t border-border bg-bg pt-3 text-center text-sm text-muted">{closedText}</p>
        ) : (
          <>
          {deals?.canPropose && deals.myRole && (
            <button
              type="button"
              onClick={propose}
              disabled={proposing || state !== "connected"}
              className="mb-2 min-h-tap w-full rounded-lg border border-brand px-4 text-sm font-medium disabled:opacity-50"
            >
              {proposing ? "Writing up the deal…" : "Propose a deal from this chat"}
            </button>
          )}
          <Composer
            channel={channel}
            channelId={channelId}
            lang={lang}
            token={session.sessionToken}
            disabled={state !== "connected"}
            onSent={(m) => setMessages((list) => merge(list, [m]))}
          />
          </>
        )}
      </div>
    </>
  );
}
