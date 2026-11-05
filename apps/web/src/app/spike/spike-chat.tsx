"use client";

import { useEffect, useState } from "react";
import { AuthResponseSchema } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import {
  connect,
  loadHistory,
  onConnectionState,
  onMessages,
  sendText,
  type ChatMessage,
  type ConnectionState,
} from "@/lib/nexconn";

const field = "min-h-tap w-full rounded-lg border border-border bg-surface px-3";
const button = "min-h-tap rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50";

// Each tab signs in through the real POST /api/auth/guest and keeps its credentials in memory only,
// so two tabs on the same origin are two different users and no token is ever typed or stored.
export function SpikeChat() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [peerId, setPeerId] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [...l, line]);

  useEffect(() => onConnectionState(setState), []);
  useEffect(
    () => onMessages((incoming) => setMessages((m) => [...m, ...incoming.filter((x) => x.from === peerId)])),
    [peerId],
  );

  async function signIn() {
    if (busy || me) return; // exactly one guest account per tab
    setBusy(true);
    try {
      const res = await api("/api/auth/guest", {
        method: "POST",
        body: { displayName: name.trim(), language: "en" },
        schema: AuthResponseSchema,
      });
      note(`signed in as ${res.user.id} (area ${res.nexconn.area})`);
      const userId = await connect(res.nexconn);
      note(`connected to Nexconn as ${userId}`);
      setMe(userId);
    } catch (e) {
      note(`sign-in failed: ${friendlyMessage(e)} ${String(e)}`);
      setBusy(false);
    }
  }

  async function openChat() {
    try {
      setMessages(await loadHistory(peerId));
      setOpen(true);
    } catch (e) {
      note(String(e));
    }
  }

  async function send() {
    const extra = JSON.stringify({ v: 1, kind: "text", orig: { lang: "en", text: draft }, tr: {} });
    try {
      const sent = await sendText(peerId, draft, extra);
      setMessages((m) => [...m, sent]);
      setDraft("");
    } catch (e) {
      note(String(e));
    }
  }

  // Finds the largest `extra` the SDK accepts (C4 open question).
  async function probeExtra() {
    for (const kb of [1, 4, 8, 16, 32, 64, 128]) {
      try {
        await sendText(peerId, `extra probe ${kb} KB`, "x".repeat(kb * 1024));
        note(`extra ${kb} KB: ok`);
      } catch (e) {
        note(`extra ${kb} KB: FAILED (${String(e)})`);
        break;
      }
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nexconn SDK spike</h1>
      <p className="text-sm text-muted">Open in two tabs. Each tab signs in as its own guest user.</p>

      {!me && (
        <div className="flex gap-2">
          <input className={field} placeholder="Test user name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className={button} disabled={!name.trim() || busy} onClick={signIn}>
            Sign in
          </button>
        </div>
      )}

      <p className="text-sm">
        Status: <strong>{state}</strong>
        {me && (
          <>
            {" "}
            · my id: <code data-testid="my-id">{me}</code>
          </>
        )}
      </p>

      {me && !open && (
        <div className="flex gap-2">
          <input className={field} placeholder="Other tab's user id" value={peerId} onChange={(e) => setPeerId(e.target.value.trim())} />
          <button className={button} disabled={!peerId} onClick={openChat}>
            Open chat
          </button>
        </div>
      )}

      {open && (
        <>
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li
                key={`${m.id}-${m.sentAt}`}
                className={`max-w-[80%] rounded-lg px-3 py-2 ${m.mine ? "self-end bg-brand text-brand-fg" : "self-start border border-border bg-surface"}`}
              >
                {m.text}
                {m.extra && <span className="block text-xs opacity-70">extra: {m.extra.length} chars</span>}
              </li>
            ))}
            {messages.length === 0 && <li className="text-sm text-muted">No messages yet. Say hello.</li>}
          </ul>
          <div className="flex gap-2">
            <input
              className={field}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && draft && send()}
              placeholder="Message"
            />
            <button className={button} disabled={!draft || state !== "connected"} onClick={send}>
              Send
            </button>
          </div>
          <button className="min-h-tap self-start text-sm underline" onClick={probeExtra}>
            Probe extra size limit
          </button>
        </>
      )}

      {log.length > 0 && <pre className="overflow-x-auto rounded-lg bg-surface p-3 text-xs">{log.join("\n")}</pre>}
    </section>
  );
}
