// MOCK: remove when the server is deployed (DHRUMIL-005). Follows C3 shapes exactly; used only while
// NEXT_PUBLIC_API_URL is unset. The Nexconn token here is fake, so chat won't connect with it.
import { GuestAuthRequestSchema, type AuthResponse, type MeResponse } from "@convocart/contracts";
import { ApiError } from "@/lib/api/errors";

const sessions = new Map<string, AuthResponse>();
const wait = () => new Promise((r) => setTimeout(r, 400));

export async function mockApi(method: string, path: string, body: unknown, token?: string): Promise<unknown> {
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
    // Mock sessions live in memory, so they "expire" on reload.
    const known = token ? sessions.get(token) : undefined;
    if (!known) throw new ApiError("UNAUTHORIZED", false, 401);
    const me: MeResponse = { user: known.user, nexconn: known.nexconn };
    return me;
  }

  throw new ApiError("NOT_MOCKED", false, 501);
}
