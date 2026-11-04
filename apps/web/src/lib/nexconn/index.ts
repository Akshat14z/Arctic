// The ONLY module that imports @nexconn/* (ARCHITECTURE §2). Browser-only: import it from client components.
// Every call here was checked against node_modules/@nexconn/chat/index.d.ts (v26.2.1).
import {
  AreaCode,
  BaseChannel,
  ConnectionStatus,
  ConnectionStatusHandler,
  DirectChannel,
  DirectChannelIdentifier,
  LogLevel,
  MessageDirection,
  MessageHandler,
  NCEngine,
  SendTextMessageParams,
  type Message,
  type TextMessageContent,
} from "@nexconn/chat";
import type { NexconnCredentials } from "@convocart/contracts";

export type ConnectionState = "connected" | "connecting" | "disconnected" | "suspended";

/** What the UI needs from a text message. `extra` carries HandshakeExtraV1 as JSON (C4). */
export type ChatMessage = {
  id: string;
  from: string;
  mine: boolean;
  text: string;
  extra?: string;
  sentAt: number;
};

const TEXT = "RC:TxtMsg";
let initializedKey: string | null = null;

const toState = (s: ConnectionStatus): ConnectionState =>
  s === ConnectionStatus.CONNECTED
    ? "connected"
    : s === ConnectionStatus.CONNECTING
      ? "connecting"
      : s === ConnectionStatus.SUSPENDED
        ? "suspended" // SDK retries by itself after 5 s
        : "disconnected";

function toChatMessage(m: Message): ChatMessage | null {
  if (m.messageType !== TEXT) return null; // C4: never crash on a foreign message; non-text is ignored for now
  const c = m.content as TextMessageContent;
  return {
    id: m.messageId,
    from: m.senderUserId,
    mine: m.direction === MessageDirection.SEND,
    text: c.text,
    extra: c.extra,
    sentAt: m.sentTime,
  };
}

/** Initializes once per App Key, then connects. Resolves to our user id (= Nexconn user id, C2). */
export async function connect({ appKey, token, area }: NexconnCredentials): Promise<string> {
  if (initializedKey !== appKey) {
    NCEngine.initialize({
      appKey,
      areaCode: AreaCode[area as keyof typeof AreaCode] ?? AreaCode.SG,
      logLevel: LogLevel.WARN,
    });
    initializedKey = appKey;
  }
  const res = await NCEngine.connect({ token });
  if (!res.isOk || !res.data) throw new Error(`Nexconn connect failed (code ${res.code})`);
  return res.data.userId;
}

export const disconnect = () => NCEngine.disconnect();

/** Returns an unsubscribe function, so callers can use it directly as a useEffect cleanup. */
export function onConnectionState(cb: (s: ConnectionState) => void): () => void {
  const id = `conn-${crypto.randomUUID()}`;
  NCEngine.addConnectionStatusHandler(
    id,
    new ConnectionStatusHandler({ onConnectionStatusChanged: ({ status }) => cb(toState(status)) }),
  );
  return () => NCEngine.removeConnectionStatusHandler(id);
}

export function onMessages(cb: (messages: ChatMessage[]) => void): () => void {
  const id = `msg-${crypto.randomUUID()}`;
  NCEngine.addMessageHandler(
    id,
    new MessageHandler({
      onMessageReceived: ({ messages }) => {
        const list = messages.map(toChatMessage).filter((m): m is ChatMessage => m !== null);
        if (list.length) cb(list);
      },
    }),
  );
  return () => NCEngine.removeMessageHandler(id);
}

/** `peerId` is the other user's id: a direct channel needs no server-side creation. */
export async function sendText(peerId: string, text: string, extra?: string): Promise<ChatMessage> {
  const res = await new DirectChannel(peerId).sendMessage(new SendTextMessageParams({ text, extra }));
  const msg = res.isOk && res.data ? toChatMessage(res.data) : null;
  if (!msg) throw new Error(`Send failed (code ${res.code})`);
  return msg;
}

/** Oldest first. */
export async function loadHistory(peerId: string, pageSize = 50): Promise<ChatMessage[]> {
  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: new DirectChannelIdentifier(peerId),
    pageSize,
  });
  const res = await query.loadNextPage();
  if (!res.isOk || !res.data) throw new Error(`History failed (code ${res.code})`);
  return res.data.data
    .map(toChatMessage)
    .filter((m): m is ChatMessage => m !== null)
    .sort((a, b) => a.sentAt - b.sentAt);
}
