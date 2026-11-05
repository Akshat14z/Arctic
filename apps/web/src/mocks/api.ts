// MOCK: remove each handler when its server route lands. Follows C3/C6 shapes exactly.
// - auth/me: only while NEXT_PUBLIC_API_URL is unset (DHRUMIL-005). The Nexconn token is fake.
// - cases: until AKSHAT-T07. Cases live in localStorage so they survive a refresh; an open case is
//   "claimed" by a mock agent after 10 s so both states can be seen. Its group chat doesn't exist on Nexconn.
import {
  ChatDetailResponseSchema,
  CreateCaseRequestSchema,
  GuestAuthRequestSchema,
  type AuthResponse,
  type Case,
  type CaseDetailResponse,
  type MeResponse,
  type User,
} from "@convocart/contracts";
import { ApiError } from "@/lib/api/errors";

const sessions = new Map<string, AuthResponse>();
const wait = () => new Promise((r) => setTimeout(r, 400));
const CASES_KEY = "handshake.mockCases";

export const MOCK_GROUP_PREFIX = "mock_grp_";
const MOCK_AGENT: User = {
  id: "mock_agent",
  displayName: "Asha (mock agent)",
  language: "en",
  role: "agent",
  isDemo: true,
  agentLanguages: ["en", "hi", "ja"],
};

function loadCases(): Record<string, Case> {
  try {
    return JSON.parse(localStorage.getItem(CASES_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveCases(cases: Record<string, Case>) {
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  } catch {}
}
function advance(c: Case): Case {
  if (c.status === "open" && Date.now() - Date.parse(c.createdAt) > 10_000) {
    return { ...c, status: "claimed", agent: MOCK_AGENT, claimedAt: new Date().toISOString() };
  }
  return c;
}

async function chatParties(base: string | undefined, channelId: string, token?: string) {
  const placeholder: User = { id: "u_mock_other", displayName: "Other person", language: "ja", role: "user", isDemo: true };
  if (!base || !token) return { buyer: placeholder, seller: placeholder };
  const res = await fetch(`${base}/api/chats/${encodeURIComponent(channelId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status === 404 ? "CHAT_NOT_FOUND" : "UNKNOWN", false, res.status);
  const chat = ChatDetailResponseSchema.parse(await res.json());
  return { buyer: chat.buyer, seller: chat.seller };
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
    const cases = loadCases();
    const existing = Object.values(cases).find((c) => c.channelId === parsed.data.channelId && c.status !== "resolved");
    if (existing) return { case: advance(existing) }; // one open case per chat
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
    saveCases({ ...cases, [id]: created });
    return { case: created };
  }

  const caseMatch = path.match(/^\/api\/cases\/([^/?]+)$/);
  if (method === "GET" && caseMatch) {
    const cases = loadCases();
    const found = cases[decodeURIComponent(caseMatch[1])];
    if (!found) throw new ApiError("CASE_NOT_FOUND", false, 404);
    const c = advance(found);
    saveCases({ ...cases, [c.id]: c });
    const detail: CaseDetailResponse = { case: c, transcript: [], summary: { lang: "en", text: "", keyFacts: [] } };
    return detail;
  }

  throw new ApiError("NOT_MOCKED", false, 501);
}
