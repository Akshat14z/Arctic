// MOCK: remove each handler when its server route lands. Follows C3/C6 shapes exactly.
// - auth/me: only while NEXT_PUBLIC_API_URL is unset (DHRUMIL-005). The Nexconn token is fake.
// - cases + agent queue/claim/resolve: until AKSHAT-T07/T08 (DHRUMIL-010). Cases live in localStorage so
//   they survive a refresh and are shared by the user and agent screens of one browser. The caller is
//   found through the real GET /api/me. The case group doesn't exist on Nexconn; transcript and summary
//   for agents are sample data, labelled "(Mock)".
import {
  ChatDetailResponseSchema,
  CreateCaseRequestSchema,
  GuestAuthRequestSchema,
  MeResponseSchema,
  ResolveCaseRequestSchema,
  type AuthResponse,
  type Case,
  type CaseDetailResponse,
  type MeResponse,
  type TranscriptLine,
  type User,
} from "@convocart/contracts";
import { ApiError } from "@/lib/api/errors";

const sessions = new Map<string, AuthResponse>();
const wait = () => new Promise((r) => setTimeout(r, 400));
const CASES_KEY = "handshake.mockCases";

export const MOCK_GROUP_PREFIX = "mock_grp_";

function loadCases(): Record<string, Case> {
  try {
    return JSON.parse(localStorage.getItem(CASES_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCase(c: Case) {
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify({ ...loadCases(), [c.id]: c }));
  } catch {}
}

async function realGet<T>(base: string, path: string, token: string, parse: (j: unknown) => T): Promise<T> {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new ApiError("UNAUTHORIZED", false, 401);
  if (!res.ok) throw new ApiError(res.status === 404 ? "CHAT_NOT_FOUND" : "UNKNOWN", false, res.status);
  return parse(await res.json());
}

async function whoAmI(base: string | undefined, token?: string): Promise<User> {
  if (!token) throw new ApiError("UNAUTHORIZED", false, 401);
  if (!base) {
    const known = sessions.get(token);
    if (!known) throw new ApiError("UNAUTHORIZED", false, 401);
    return known.user;
  }
  return (await realGet(base, "/api/me", token, (j) => MeResponseSchema.parse(j))).user;
}

async function requireAgent(base: string | undefined, token?: string) {
  const me = await whoAmI(base, token);
  if (me.role !== "agent") throw new ApiError("FORBIDDEN", false, 403);
  return me;
}

async function chatParties(base: string | undefined, channelId: string, token: string) {
  const placeholder: User = { id: "u_mock_other", displayName: "Other person", language: "ja", role: "user", isDemo: true };
  if (!base) return { buyer: placeholder, seller: placeholder };
  const chat = await realGet(base, `/api/chats/${encodeURIComponent(channelId)}`, token, (j) => ChatDetailResponseSchema.parse(j));
  return { buyer: chat.buyer, seller: chat.seller };
}

/** Sample agent data so the console can be built before AKSHAT-T08. Clearly labelled. */
function sampleAgentView(c: Case, agent: User): Pick<CaseDetailResponse, "transcript" | "summary"> {
  const t0 = Date.parse(c.createdAt) - 30 * 60_000;
  const line = (mins: number, from: User, lang: "hi" | "ja", text: string, tr: Record<string, string>): TranscriptLine => {
    const shownTo = Object.fromEntries(
      [c.buyer, c.seller].map((u) => {
        const translated = u.language !== lang && !!tr[u.language];
        return [u.id, { lang: translated ? u.language : lang, text: translated ? tr[u.language] : text, translated }];
      }),
    );
    return { at: new Date(t0 + mins * 60_000).toISOString(), from: from.id, orig: { lang, text }, tr, shownTo };
  };
  return {
    transcript: [
      line(0, c.buyer, "hi", "(Mock) क्या बॉक्स में सब कुछ है?", { ja: "(Mock) 箱にすべて入っていますか？", en: "(Mock) Is everything in the box?" }),
      line(2, c.seller, "ja", "(Mock) はい、付属品はすべて揃っています。", { hi: "(Mock) हाँ, सारी एक्सेसरीज़ हैं।", en: "(Mock) Yes, all accessories are included." }),
      line(25, c.buyer, "hi", "(Mock) डॉक नहीं है।", { ja: "(Mock) ドックがありません。", en: "(Mock) The dock is missing." }),
    ],
    summary: {
      lang: agent.language,
      text: `(Mock summary) ${c.buyer.displayName} says the item isn't as described: the seller confirmed all accessories were included, but the buyer reports the dock is missing.`,
      keyFacts: ["(Mock) Seller wrote that all accessories are included", "(Mock) Buyer reports the dock is missing", "(Mock) No payment issue raised"],
      deal: {
        id: "d_mock",
        listingId: "l_mock",
        channelId: c.channelId,
        item: { en: "(Mock) Nintendo Switch OLED, complete in box", ja: "(Mock) ニンテンドースイッチ 有機EL 箱・付属品完備" },
        price: { amount: 35000, currency: "JPY" },
        quantity: 1,
        delivery: { method: "pickup" },
        conditions: { en: ["(Mock) Box and all accessories included"] },
        agreedBy: { buyer: new Date(t0 + 5 * 60_000).toISOString(), seller: new Date(t0 + 6 * 60_000).toISOString() },
        status: "agreed",
      },
    },
  };
}

export async function mockApi(method: string, path: string, body: unknown, token?: string, base?: string): Promise<unknown> {
  await wait();

  if (method === "POST" && path === "/api/auth/guest") {
    const parsed = GuestAuthRequestSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", false, 400);
    const id = `u_mock${crypto.randomUUID().slice(0, 8)}`;
    const res: AuthResponse = {
      sessionToken: `mock_session_${id}`,
      user: { id, ...parsed.data, role: "user", isDemo: false },
      nexconn: { appKey: "mock-app-key", token: "mock-nexconn-token", area: "SG" },
    };
    sessions.set(res.sessionToken, res);
    return res;
  }

  if (method === "GET" && path === "/api/me") {
    const known = token ? sessions.get(token) : undefined; // in memory, so mock sessions "expire" on reload
    if (!known) throw new ApiError("UNAUTHORIZED", false, 401);
    const me: MeResponse = { user: known.user, nexconn: known.nexconn };
    return me;
  }

  if (method === "POST" && path === "/api/cases") {
    if (!token) throw new ApiError("UNAUTHORIZED", false, 401);
    const parsed = CreateCaseRequestSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", false, 400);
    const existing = Object.values(loadCases()).find((c) => c.channelId === parsed.data.channelId && c.status !== "resolved");
    if (existing) return { case: existing }; // one open case per chat
    const { buyer, seller } = await chatParties(base, parsed.data.channelId, token);
    const now = new Date();
    const id = `c_mock${crypto.randomUUID().slice(0, 8)}`;
    const created: Case = {
      id,
      channelId: parsed.data.channelId,
      groupChannelId: `${MOCK_GROUP_PREFIX}${id}`,
      buyer,
      seller,
      reason: parsed.data.reason,
      status: "open",
      languages: [...new Set([buyer.language, seller.language])],
      createdAt: now.toISOString(),
      slaDueAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    };
    saveCase(created);
    return { case: created };
  }

  if (method === "GET" && path === "/api/agent/queue") {
    await requireAgent(base, token);
    const rank = (c: Case) => (c.status === "open" ? 0 : 1);
    const items = Object.values(loadCases())
      .filter((c) => c.status !== "resolved")
      .sort((a, b) => rank(a) - rank(b) || Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt));
    return { items };
  }

  const m = path.match(/^\/api\/cases\/([^/?]+)(\/claim|\/resolve)?$/);
  const found = m ? loadCases()[decodeURIComponent(m[1])] : undefined;
  if (m && !found) throw new ApiError("CASE_NOT_FOUND", false, 404);

  if (found && method === "POST" && m?.[2] === "/claim") {
    const agent = await requireAgent(base, token);
    if (found.status !== "open" && found.agent?.id !== agent.id) throw new ApiError("CASE_ALREADY_CLAIMED", false, 409);
    const claimed: Case = found.status === "open" ? { ...found, status: "claimed", agent, claimedAt: new Date().toISOString() } : found;
    saveCase(claimed);
    return { case: claimed };
  }

  if (found && method === "POST" && m?.[2] === "/resolve") {
    const agent = await requireAgent(base, token);
    if (found.agent?.id !== agent.id) throw new ApiError("FORBIDDEN", false, 403);
    const parsed = ResolveCaseRequestSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("VALIDATION_ERROR", false, 400);
    const resolved: Case = { ...found, status: "resolved", resolution: parsed.data.resolution, resolvedAt: new Date().toISOString() };
    saveCase(resolved);
    return { case: resolved };
  }

  if (found && method === "GET" && !m?.[2]) {
    const me = await whoAmI(base, token);
    const isParty = me.id === found.buyer.id || me.id === found.seller.id;
    if (me.role !== "agent" && !isParty) throw new ApiError("FORBIDDEN", false, 403);
    const extra = me.role === "agent" ? sampleAgentView(found, me) : { transcript: [], summary: { lang: me.language, text: "", keyFacts: [] } };
    const detail: CaseDetailResponse = { case: found, ...extra };
    return detail;
  }

  throw new ApiError("NOT_MOCKED", false, 501);
}
