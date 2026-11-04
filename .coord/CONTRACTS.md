# Contracts — single source of truth for Dhrumil ↔ Akshat interfaces

Owner: **Akshat**. Dhrumil reads; Dhrumil requests changes with a `REQUEST`.
Must always match `packages/contracts` (TypeScript + zod). Status per section: `DRAFT` · `STABLE` · `UNVERIFIED`.

> v0 was drafted by the humans before any Nexconn code was written. **Akshat's first job (AKSHAT-T01/AKSHAT-T02) is to verify the `UNVERIFIED` parts against the real SDK and update this file.**

---

## C1. Conventions — `DRAFT`

- Base URL: `NEXT_PUBLIC_API_URL` (web) → server. All routes under `/api`.
- Auth: `Authorization: Bearer <sessionToken>` (our own session token, issued by `/api/auth/*`). Not the Nexconn token.
- JSON everywhere. Timestamps: ISO 8601 UTC strings. Money: `{ amount: number, currency: "INR" | "USD" | ... }` with `amount` in major units (rupees, not paise).
- Errors: HTTP status + body `{ "error": { "code": "SNAKE_CASE", "message": "Human readable", "retryable": boolean } }`.
- IDs: our users `u_<nanoid>`, listings `l_<nanoid>`, cases `c_<nanoid>`. Seeded demo data uses `demo_` prefix (e.g. `demo_u_seller1`).
- Languages (v0): `en`, `hi`, `ta`, `te`, `kn`, `bn`, `mr`, `ja`. ISO 639-1 codes. See DECISIONS D-010.

## C2. Identity & roles — `DRAFT`

```ts
type Role = "user" | "agent";           // any "user" can buy and sell
type User = {
  id: string; displayName: string; language: LangCode;
  role: Role; isDemo: boolean; agentLanguages?: LangCode[]; // agents only
  keptDeals?: { kept: number; total: number };             // D-026, present when total >= 1
};
```

The Nexconn user id **equals** our `User.id` (to be verified in AKSHAT-T02 — `UNVERIFIED`).

## C3. REST API — `DRAFT`

| Method & path | Body | Returns | Notes |
|---|---|---|---|
| `POST /api/auth/guest` | `{ displayName, language }` | `{ sessionToken, user, nexconn: { appKey, token, area } }` | Registers user on Nexconn server-side, returns Nexconn token |
| `POST /api/auth/agent` | `{ displayName, language, agentLanguages, code }` | same as `/api/auth/guest`, `user.role = "agent"` | `code` must equal `AGENT_ACCESS_CODE`; wrong code → 403 `BAD_AGENT_CODE` (D-017) |
| `GET /api/me` | – | `{ user, nexconn: { appKey, token, area } }` | Re-issue on refresh |
| `PATCH /api/me` | `{ displayName?, language? }` | `{ user }` | |
| `GET /api/listings?q=&cursor=` | – | `{ items: Listing[], nextCursor? }` | |
| `POST /api/listings` | `{ title, description, price: Money, imageUrl? }` | `{ listing }` | Title/description stored in author's language + translated on read |
| `GET /api/listings/:id?lang=` | – | `{ listing }` | Fields translated into `lang`. **Public, no auth** (D-025) |
| `POST /api/chats` | `{ listingId }` | `{ channelId, channelType: "direct", seller: User, listing }` | Idempotent: same buyer+listing → same chat |
| `GET /api/chats` | – | `{ items: ChatSummary[] }` | For the inbox view |
| `POST /api/messages/prepare` | `{ channelId, text, senderLang }` | `PreparedMessage` (see C4) | Translation + Meaning Guard. **Called before every send.** |
| `POST /api/deals/extract` | `{ channelId }` | `{ deal: Deal \| null }` | Phase 2 |
| `GET /api/seals/:code?lang=` | – | `{ deal, sealedAt, buyer: { displayName }, seller: { displayName } }` | **Public, no auth.** 404 if unknown (D-023) |
| `POST /api/cases` | `{ channelId, reason: CaseReason, note? }` | `{ case: Case }` | Escalation. Creates the 3-way group. |
| `GET /api/agent/queue` | – | `{ items: Case[] }` | Agents only |
| `POST /api/cases/:id/claim` | – | `{ case }` | Agents only. 409 if already claimed. |
| `POST /api/cases/:id/resolve` | `{ resolution: string }` | `{ case }` | Agents only |
| `GET /api/cases/:id` | – | `{ case, transcript: TranscriptLine[], summary: CaseSummary }` | Bilingual transcript |
| `POST /api/demo/session` | `{ as: "buyer" \| "seller" \| "agent" }` | same as `/api/auth/guest` | Judge sandbox, seeded data. Phase 3. |

## C4. Message payload — `STABLE` (`extra` verified)

Messages are **sent by the web client through the Nexconn Web SDK**, after calling `/api/messages/prepare`. The structured data rides in the message's extra/custom field.

**To verify in AKSHAT-T02:** does a Nexconn text message support an `extra` (or equivalent) field? What is its size limit? Or should we register a custom message type? Until verified, Dhrumil builds against the shape below but keeps the SDK call isolated in one module.

```ts
type HandshakeExtraV1 = {
  v: 1;
  kind: "text" | "deal_card" | "system";
  orig: { lang: LangCode; text: string };
  tr: Partial<Record<LangCode, string>>;     // translations, at least the recipient's language
  guard?: { issues: GuardIssue[]; acknowledged: boolean };
  deal?: Deal;                                // when kind === "deal_card"
  system?: { event: "case_opened" | "case_claimed" | "case_resolved" | "scam_warning"; caseId?: string; text: Partial<Record<LangCode, string>> };
};

type PreparedMessage = {
  messageText: string;          // plain-text fallback body (original text)
  extra: HandshakeExtraV1;
  guard: { issues: GuardIssue[]; blocking: boolean }; // blocking = must confirm before send
};

type GuardIssue = {
  kind: "number_format" | "currency" | "date" | "unit" | "ambiguity" | "scam_signal" | "tone"; // tone: never blocking (D-024)
  span: string;                 // the original fragment, e.g. "2 lakh"
  explanation: Partial<Record<LangCode, string>>; // shown to sender in their language
  suggestion?: string;          // e.g. "₹2,00,000 (≈ $2,400)"
};
```

**Render rule (Dhrumil):** show `tr[myLang]` if present, else `orig.text`; always offer "See original". If `extra` is missing or `v` is unknown, render the plain text body. Never crash on a foreign message.

## C5. Deal Card — `DRAFT` (Phase 2)

```ts
type Deal = {
  id: string; listingId: string; channelId: string;
  item: Partial<Record<LangCode, string>>;
  price: Money; quantity: number;
  delivery?: { method: "pickup" | "shipping"; date?: string };
  conditions: Partial<Record<LangCode, string[]>>;
  agreedBy: { buyer?: string; seller?: string };  // ISO timestamps
  sealCode?: string;                              // set when both agreed (D-023); public page /seal/<code>
  status: "proposed" | "agreed" | "disputed";
};
```

## C6. Cases & escalation — `DRAFT`

```ts
type CaseReason = "item_not_as_described" | "payment_issue" | "scam_suspected" | "misunderstanding" | "other";
type Case = {
  id: string; channelId: string; groupChannelId: string;
  buyer: User; seller: User; agent?: User;
  reason: CaseReason; status: "open" | "claimed" | "resolved";
  languages: LangCode[]; createdAt: string; claimedAt?: string; resolvedAt?: string;
  slaDueAt: string;
  dealSnapshot?: Deal;          // latest agreed Deal, frozen when the case opens (D-018)
};
type TranscriptLine = {
  at: string; from: string; orig: { lang: LangCode; text: string }; tr: Partial<Record<LangCode, string>>;
  shownTo: Record<string, { lang: LangCode; text: string; translated: boolean }>; // userId → what that member's screen showed (D-022)
};
type CaseSummary = { lang: LangCode; text: string; keyFacts: string[]; deal?: Deal };
```

**Flow:**
1. Dhrumil calls `POST /api/cases` → Akshat creates a Nexconn **group** channel with buyer + seller (server-side group creation verified via `GroupChannelManagementApi.createGroupChannel`), posts a `system/case_opened` message, returns the case.
2. Dhrumil shows the user "An agent is on the way" and opens the group channel.
3. Agent console polls `GET /api/agent/queue` every 5 s (v0; push later if time allows).
4. Agent claims → Akshat adds agent to the group (`UNVERIFIED`), posts `system/case_claimed`.
5. Agent resolves → Akshat posts `system/case_resolved`, marks case resolved.

**Routing v0:** prefer agents whose `agentLanguages` cover both parties' languages; among them, fewest open claimed cases; otherwise any agent.

## C7. Webhooks — internal to Akshat

Akshat receives Nexconn's `message:send` webhook for: transcript storage, scam detection, and case audit. Dhrumil doesn't depend on it. If Akshat detects a scam signal, Akshat posts a `system/scam_warning` message into the channel (`UNVERIFIED`: server-side message send).

## C8. Environment variables — `DRAFT`

| Var | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | web | no |
| `NEXCONN_APP_KEY` | server | no (also returned to clients) |
| `NEXCONN_APP_SECRET` | server | **yes** |
| `NEXCONN_AREA` | server | no |
| `DATABASE_URL` | server | **yes** |
| `LLM_API_KEY`, `LLM_MODEL` | server | **yes** / no |
| `SESSION_SECRET` | server | **yes** |
| `WEB_ORIGIN` | server (CORS) | no |
| `AGENT_ACCESS_CODE` | server | **yes** (D-017) |

---

## Verified Nexconn facts (Akshat maintains; Dhrumil sends `FINDING`s for client-side facts and Akshat copies them here)

| # | Fact | Verified by | Source |
|---|---|---|---|
| – | Text messages have `extra?: string` (C4); size limit tested via /spike probe | Dhrumil | `node_modules/@nexconn/chat/index.d.ts` (v26.2.1) |
| 1 | Direct channels require no server-side creation (`new DirectChannel(otherUserId)`) | Dhrumil | `node_modules/@nexconn/chat/index.d.ts` (v26.2.1) |
| 2 | Official Server SDK is `@nexconn/server-sdk` v0.1.2 from `github:NexconnAI-Dev/nexconn-server-sdk-node` | Akshat | `node_modules/@nexconn/server-sdk/package.json` |
| 3 | Server user token generation via `userManagementApi.issueAccessToken({ userId, name })` returning `result.accessToken` | Akshat | `node_modules/@nexconn/server-sdk/dist/api.d.ts` |
| 4 | Server-side group creation supported via `groupChannelManagementApi.createGroupChannel({ channelId, name, owner, userIds })` | Akshat | `node_modules/@nexconn/server-sdk/dist/api.d.ts` |
| 5 | Server client requires `setPrimaryBackupDomains(primary, backup)` before sending requests | Akshat | `node_modules/@nexconn/server-sdk/dist/configuration.d.ts` |
