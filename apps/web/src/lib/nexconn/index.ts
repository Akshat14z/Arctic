// The ONLY module that imports @nexconn/* (ARCHITECTURE §2). Browser-only: import it from client components.
// Every call here was checked against node_modules/@nexconn/chat/index.d.ts (v26.2.1).
import {
  AreaCode,
  BaseChannel,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  DirectChannel,
  DirectChannelIdentifier,
  GroupChannel,
  GroupChannelIdentifier,
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

/** Where a message goes. Marketplace chats are groups (D-029); `direct` (id = other user) is for /spike. */
export type ChannelRef = { type: "direct" | "group"; id: string };

/** What the UI needs from a text message. `extra` carries HandshakeExtraV1 as JSON (C4). */
export type ChatMessage = {
  id: string;
  channel: ChannelRef;
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

const channelOf = ({ type, id }: ChannelRef) => (type === "group" ? new GroupChannel(id) : new DirectChannel(id));
const identifierOf = ({ type, id }: ChannelRef) =>
  type === "group" ? new GroupChannelIdentifier(id) : new DirectChannelIdentifier(id);

function toChatMessage(m: Message): ChatMessage | null {
  if (m.messageType !== TEXT) return null; // C4: never crash on a foreign message; non-text is ignored for now
  const c = m.content as TextMessageContent;
  const ch = m.channelIdentifier;
  return {
    id: m.messageId,
    channel: { type: ch.channelType === ChannelType.GROUP ? "group" : "direct", id: ch.channelId },
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
    try {
      const { NCCallEngine } = await import("@nexconn/call");
      NCCallEngine.install();
    } catch (e) {
      console.warn("[NexConn] Call engine install skipped:", e);
    }
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

export function getConnectionState(): ConnectionState {
  return initializedKey ? toState(NCEngine.getConnectionStatus()) : "disconnected";
}

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

export const sameChannel = (a: ChannelRef, b: ChannelRef) => a.type === b.type && a.id === b.id;

export async function sendText(channel: ChannelRef, text: string, extra?: string): Promise<ChatMessage> {
  const res = await channelOf(channel).sendMessage(new SendTextMessageParams({ text, extra }));
  const msg = res.isOk && res.data ? toChatMessage(res.data) : null;
  if (!msg) throw new Error(`Send failed (code ${res.code})`);
  return msg;
}

/** Oldest first. */
export async function loadHistory(channel: ChannelRef, pageSize = 50): Promise<ChatMessage[]> {
  const query = BaseChannel.createMessagesQuery({ channelIdentifier: identifierOf(channel), pageSize });
  const res = await query.loadNextPage();
  if (!res.isOk || !res.data) throw new Error(`History failed (code ${res.code})`);
  return res.data.data
    .map(toChatMessage)
    .filter((m): m is ChatMessage => m !== null)
    .sort((a, b) => a.sentAt - b.sentAt);
}
