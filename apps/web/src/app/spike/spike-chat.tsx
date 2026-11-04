"use client";

import { useEffect, useState } from "react";
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

export function SpikeChat() {
  const [creds, setCreds] = useState({ appKey: "", area: "SG", token: "", peerId: "" });
  const [me, setMe] = useState<string | null>(null);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [...l, line]);

  useEffect(() => onConnectionState(setState), []);
  useEffect(
    () =>
      onMessages((incoming) =>
        setMessages((m) => [...m, ...incoming.filter((x) => x.from === creds.peerId)]),
      ),
    [creds.peerId],
  );

  async function start() {
    try {
      const userId = await connect(creds);
      setMe(userId);
      note(`connected as ${userId}`);
      setMessages(await loadHistory(creds.peerId));
    } catch (e) {
      note(String(e));
    }
  }

  async function send() {
    const extra = JSON.stringify({ v: 1, kind: "text", orig: { lang: "en", text: draft }, tr: {} });
    try {
      const sent = await sendText(creds.peerId, draft, extra);
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
        await sendText(creds.peerId, `extra probe ${kb} KB`, "x".repeat(kb * 1024));
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
      <p className="text-sm text-muted">
        Open this page in two browsers, one per test user. Credentials stay in this tab only.
      </p>

      {!me && (
        <div className="flex flex-col gap-2">
          {(["appKey", "token", "peerId"] as const).map((k) => (
            <input
              key={k}
              className={field}
              placeholder={{ appKey: "App Key", token: "Your user token", peerId: "Other user's id" }[k]}
              value={creds[k]}
              onChange={(e) => setCreds({ ...creds, [k]: e.target.value.trim() })}
            />
          ))}
          <select className={field} value={creds.area} onChange={(e) => setCreds({ ...creds, area: e.target.value })}>
            {["SG", "NA", "SA", "OM"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <button className={button} disabled={!creds.appKey || !creds.token || !creds.peerId} onClick={start}>
            Connect
          </button>
        </div>
      )}

      <p className="text-sm">
        Status: <strong>{state}</strong>
        {me && ` · me: ${me} · peer: ${creds.peerId}`}
      </p>

      {me && (
        <>
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li
                key={m.id || m.sentAt}
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
