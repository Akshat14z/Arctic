"use client";

import { useEffect, useRef, useState } from "react";
import {
  DealAgreeResponseSchema,
  DealResponseSchema,
  ExtractDealResponseSchema,
  type AuthResponse,
  type Deal,
  type HandshakeExtraV1,
  type Money,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { ensureConnected, useConnectionState } from "@/lib/chat-connection";
import { loadHistory, onMessages, sameChannel, sendText, type ChannelRef, type ChatMessage } from "@/lib/nexconn";
import { parseExtra } from "@/lib/render";
import { Composer } from "./composer";
import { DealCard, dealSummary, type DealRole } from "./deal-card";
import { MessageBubble } from "./message-bubble";
import { OfferModal } from "./offer-modal";
import { translator } from "@/lib/i18n";

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
  listingTitle?: string;
  originalPrice?: Money;
  /** Set when sending isn't allowed (e.g. a resolved case); shown in place of the composer. */
  closedText?: string;
  /** Deal Cards: who I am in this deal, and both names. Omit `myRole` for read-only (agents). */
  deals?: { myRole?: DealRole; names: Record<DealRole, string>; canPropose: boolean };
};

/** Messages, history, live updates and the composer for one Nexconn channel. */
export function ChatThread({
  session,
  channel,
  channelId,
  emptyText,
  listingTitle = "Item in negotiation",
  originalPrice,
  closedText,
  deals,
}: Props) {
  const state = useConnectionState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // "Try again" re-runs the history load
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number | undefined>();
  const endRef = useRef<HTMLDivElement>(null);
  const lang = session.user.language;
  const t = translator(lang);

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
      () => live && setError(t("chat.historyFailed")),
    );
    const off = onMessages((incoming) => setMessages((m) => merge(m, incoming.filter((x) => sameChannel(x.channel, channel)))));
    return () => {
      live = false;
      off();
    };
    // Keyed on the channel's type + id (not the object) so a new-but-equal ref doesn't resubscribe.
  }, [channel.type, channel.id, state, attempt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  /** A deal travels as a C4 `deal_card` message; every new version (agreements) is a new message. */
  async function sendDeal(deal: Deal) {
    const text = dealSummary(deal, lang);
    const extra: HandshakeExtraV1 = { v: 1, kind: "deal_card", orig: { lang, text }, tr: {}, deal };
    const sent = await sendText(channel, text, JSON.stringify(extra));
    setMessages((list) => merge(list, [sent]));
  }

  async function handleAgree(deal: Deal) {
    const { deal: updated } = await api(`/api/deals/${encodeURIComponent(deal.id)}/agree`, {
      method: "POST",
      token: session.sessionToken,
      schema: DealAgreeResponseSchema,
    });
    await sendDeal(updated);
  }

  async function handleReject(deal: Deal) {
    const { deal: updated } = await api(`/api/deals/${encodeURIComponent(deal.id)}/reject`, {
      method: "POST",
      token: session.sessionToken,
      schema: DealResponseSchema,
    });
    await sendDeal(updated);
  }

  function handleCounter(deal: Deal) {
    setCounterPrice(deal.price.amount);
    setShowOfferModal(true);
  }

  // Only the newest message of each deal is shown, so agreements update one card instead of stacking.
  const latestDealMessage = new Map<string, string>();
  for (const m of messages) {
    const d = parseExtra(m.extra);
    if (d?.kind === "deal_card" && d.deal) latestDealMessage.set(d.deal.id, m.id);
  }

  // Once a deal is agreed (and sealed), proposing another from the same chat only confuses: hide it.
  const hasAgreedDeal = messages.some((m) => {
    const d = parseExtra(m.extra);
    return d?.kind === "deal_card" && d.deal?.status === "agreed" && latestDealMessage.get(d.deal.id) === m.id;
  });

  const recipientRole = deals?.myRole === "buyer" ? "seller" : "buyer";
  const recipientName = deals ? deals.names[recipientRole] : "Trader";

  return (
    <>
      {state !== "connected" && (
        <p role="status" className="note note-guard mt-3">
          {state === "disconnected" ? t("chat.offline") : t("chat.connecting")}
        </p>
      )}
      {error && (
        <p role="alert" className="note note-error mt-3 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-quiet">
            Try again
          </button>
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3 py-4" aria-live="polite">
        {messages.length === 0 && state === "connected" && !error && (
          <p className="meta self-center py-12 text-center">{emptyText}</p>
        )}
        {messages.map((m) => {
          const d = parseExtra(m.extra);
          if (d?.kind === "deal_card" && d.deal) {
            if (latestDealMessage.get(d.deal.id) !== m.id) return null;
            return deals ? (
              <DealCard
                key={m.id}
                deal={d.deal}
                lang={lang}
                myRole={deals.myRole}
                names={deals.names}
                onAgree={deals.myRole ? handleAgree : undefined}
                onReject={deals.myRole ? handleReject : undefined}
                onCounter={deals.myRole ? handleCounter : undefined}
              />
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
          <p className="meta border-t border-border bg-bg pt-3 text-center">{closedText}</p>
        ) : (
          <>
            {deals?.canPropose && deals.myRole && !hasAgreedDeal && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2">
                <p className="meta">{t("chat.offerPrompt")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCounterPrice(undefined);
                    setShowOfferModal(true);
                  }}
                  disabled={state !== "connected"}
                  className="btn btn-secondary"
                >
                  {t("chat.makeOffer")}
                </button>
              </div>
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

      {/* Structured Offer Creation Dialog */}
      {deals?.myRole && (
        <OfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          channelId={channelId}
          token={session.sessionToken}
          lang={lang}
          listingTitle={listingTitle}
          originalPrice={originalPrice}
          recipientName={recipientName}
          recipientRole={recipientRole}
          initialPrice={counterPrice}
          onOfferSent={async (newDeal) => {
            await sendDeal(newDeal);
          }}
        />
      )}
    </>
  );
}
