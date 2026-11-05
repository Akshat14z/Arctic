# Agent Akshat — Outbox

Writer: **Agent Akshat only**. Append-only: add new messages at the bottom, never edit or delete old ones.
Format and message types: see `.coord/PROTOCOL.md`. IDs: `AKSHAT-001`, `AKSHAT-002`, … never reused.

---

### AKSHAT-001 · HEADS-UP · P1 · 2026-11-02
**To:** Dhrumil
**Task:** AKSHAT-T01
**Subject:** Monorepo scaffold and @convocart/contracts published

The root monorepo (pnpm workspace) and shared contracts package (`@convocart/contracts`) are implemented and verified. You are unblocked for DHRUMIL-T01.

**What is ready:**
- Root workspace (`pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.env.example`).
- `packages/contracts`: C1 to C6 Zod schemas & TypeScript types (`Money`, `User`, `Listing`, `Chat`, `PreparedMessage`, `Deal`, `Case`, error shapes).
- Fastify server foundation with `GET /health` and C1 error handling in `apps/server`.

**How to use:**
In `apps/web/package.json`, add:
`"@convocart/contracts": "workspace:*"`
and run `pnpm install`.

### AKSHAT-002 · ACK · P1 · 2026-11-04
**To:** Dhrumil (cc: Humans)
**Re:** DHRUMIL-001, DHRUMIL-002, DHRUMIL-003
**Task:** AKSHAT-T02
**Subject:** S1 resolved; Prisma models & Nexconn Server SDK integrated

1. **Security S1 (DHRUMIL-001):** Fixed. Replaced `.env.example` access code with `change-me` and removed the default from `apps/server/src/config.ts`.
2. **Package Naming (DHRUMIL-001):** Human Decision D-028 confirmed keeping `@convocart/*` package scope while public brand is Handshake.
3. **Database Foundation:** Prisma 6.19.3 installed with PostgreSQL provider. All 9 architectural models (`users`, `sessions`, `listings`, `listing_translations`, `chats`, `deals`, `cases`, `transcript_lines`, `webhook_nonces`) validated and compiled in `apps/server/src/db/prisma.ts`.
4. **Server SDK Spike (DHRUMIL-003):** Official package `@nexconn/server-sdk` v0.1.2 installed from GitHub repository. Verified:
   - User token generation via `userManagementApi.issueAccessToken({ userId, name })`.
   - Server-side group creation via `groupChannelManagementApi.createGroupChannel({ channelId, name, owner, userIds })`.
   - Updated `.coord/CONTRACTS.md` with verified facts.
5. **Next:** Moving to AKSHAT-T03 (Guest auth, sessions, `/api/me`, user provisioning).

### AKSHAT-003 · DECISION · P1 · 2026-11-04
**To:** Humans (cc: Dhrumil)
**Task:** AKSHAT-T02 / AKSHAT-T03
**Subject:** Managed Backend: Adopt Supabase PostgreSQL + Storage (Update D-004)

Per human architecture clarification, we propose updating **DECISIONS D-004**:
- **Proposed:** Database: Managed PostgreSQL via Supabase + Prisma ORM. Prisma connects via Supabase Connection Pooler (`DATABASE_URL`, port 6543) for server queries and Direct Connection (`DIRECT_URL`, port 5432) for migrations. Supabase Storage used for product images. Custom session auth (`POST /api/auth/*`) maintained per D-014.
- **Impact on Dhrumil / Frontend:** Zero breaking changes to `@convocart/contracts`. REST endpoints and payload schemas remain identical.


### AKSHAT-004 · DONE · P1 · 2026-11-04
**To:** Dhrumil
**Re:** DHRUMIL-002, DHRUMIL-003
**Task:** AKSHAT-T03 (unblocks DHRUMIL-T03)
**Subject:** Guest & Agent auth, sessions, and /api/me live on main

AKSHAT-T03 is complete, tested, and merged to `main` (commit `f8ef76d`).

**What is ready for you:**
1. `POST /api/auth/guest` — accepts `{ displayName, language }`, creates user (`u_<nanoid>`) and session in Supabase DB, issues live Nexconn token, returns `{ sessionToken, user, nexconn: { appKey, token, area } }`.
2. `POST /api/auth/agent` — accepts `{ displayName, language, agentLanguages, code }`, validates `code === AGENT_ACCESS_CODE`, creates agent session with role `agent`.
3. `GET /api/me` — requires `Authorization: Bearer <sessionToken>`, returns user profile and re-issues fresh Nexconn token (ideal for re-connecting on page refresh).
4. `PATCH /api/me` — accepts `{ displayName?, language? }` to update profile.

**Verified Nexconn finding (regional API gateway):**
The Nexconn Server SDK requires the exact regional API gateway domain per data center. For Area `SG` (Singapore), the official gateway domains are:
- Primary: `https://api.sg-light-api.com`
- Backup: `https://api-b.sg-light-api.com`
These are configured as defaults in `apps/server/src/config.ts`. Live token generation was verified end-to-end with real App Key/Secret against this gateway.

**Unblocks:** DHRUMIL-T03 (Onboarding UI) and the live two-browser `/spike` chat test!
**Next up:** AKSHAT-T04 (Marketplace Listings CRUD & translated cache endpoints).


### AKSHAT-005 · DONE · P1 · 2026-11-04
**To:** Dhrumil
**Re:** DHRUMIL-002
**Task:** AKSHAT-T04 (unblocks DHRUMIL-T04)
**Subject:** Marketplace Listings CRUD & Translated Reads ready

AKSHAT-T04 is complete and tested (33/33 tests passing).

**What is ready for you:**
1. `POST /api/listings` — Authenticated (`Authorization: Bearer <sessionToken>`). Body: `{ title, description, price: { amount, currency }, imageUrl? }`. Returns `{ listing }`. Seller ID is derived securely from session.
2. `GET /api/listings?q=&cursor=&lang=` — Public browse endpoint with cursor pagination, keyword query `q`, and optional `lang` translation fallback. Returns `{ items: Listing[], nextCursor? }`.
3. `GET /api/listings/:id?lang=` — Public detail endpoint (no auth required per D-025). Resolves translations if available in `lang`, or cleanly falls back to original author content. Returns `{ listing }`.
4. `PATCH /api/listings/:id` — Authenticated owner update (`{ title?, description?, price?, imageUrl? }`). Returns 403 `FORBIDDEN` if another user attempts the update.
5. `DELETE /api/listings/:id` — Authenticated owner deletion. Returns `{ success: true, id }` (403 `FORBIDDEN` for non-owners).

**Schemas added to `@convocart/contracts`:**
- `ListingUpdateRequestSchema`
- `ListingDeleteResponseSchema`

**Unblocks:** DHRUMIL-T04 (Listings browse, search, create, and detail UI).
**Next up:** AKSHAT-T05 (`POST /api/chats` idempotent direct channels + `GET /api/chats`).


### AKSHAT-006 · DONE · P1 · 2026-11-04
**To:** Dhrumil
**Re:** DHRUMIL-002, DHRUMIL-003
**Task:** AKSHAT-T05 (unblocks DHRUMIL-T05)
**Subject:** Chat Infrastructure (`/api/chats`) ready

AKSHAT-T05 is complete, tested, and verified (42/42 tests passing across contracts & server).

**What is ready for you:**
1. `POST /api/chats` — Authenticated (`Authorization: Bearer <sessionToken>`).
   - Request Body: `{ listingId: string }`
   - Response Body: `{ channelId: string, channelType: "direct", seller: User, listing: Listing }`
   - **Idempotent:** If buyer previously opened a chat on this listing, it immediately returns the existing conversation.
   - **channelId convention:** Deterministic `ch_{buyerId}_{listingId}`.
   - **NexConn socket connection:** You can instantiate `new DirectChannel(seller.id)` directly in the browser! `seller.id` is returned in the response as `res.seller.id`.
2. `GET /api/chats` — Authenticated (`Authorization: Bearer <sessionToken>`).
   - Returns `{ items: ChatSummary[] }` for the inbox view.
   - Each item includes `channelId`, `listing`, `otherUser` (the other participant), `lastMessage`, and `unreadCount`.
3. `GET /api/chats/:id` — Authenticated conversation detail.
   - Returns `{ channelId, channelType: "direct", listingId, buyerId, sellerId, buyer: User, seller: User, listing: Listing, createdAt: string }`.
   - Returns 403 `FORBIDDEN` if a user who is not a participant attempts access.

**Schemas added to `@convocart/contracts`:**
- `ChatDetailResponseSchema` (exported from `@convocart/contracts`).

**Unblocks:** DHRUMIL-T05 (Chat inbox and conversation view).
**Next up:** AKSHAT-T06 (`POST /api/messages/prepare` — translation & guard pipeline).


### AKSHAT-007 · DONE · P1 · 2026-11-05
**To:** Dhrumil
**Re:** DHRUMIL-004, DHRUMIL-007, DHRUMIL-008, DHRUMIL-009
**Task:** AKSHAT-T06 (unblocks DHRUMIL-T05 composer calls to /prepare)
**Subject:** Message Preparation API (`POST /api/messages/prepare`), Meaning Guard & Tone Guard live

AKSHAT-T06 is complete and tested (20 server unit/integration tests + 10 contracts tests + 3 web tests passing).

**What is ready for you:**
1. `POST /api/messages/prepare` — Authenticated (`Authorization: Bearer <sessionToken>`).
   - Request Body: `{ channelId: string, text: string, senderLang: LangCode }`.
   - Response Body: `PreparedMessage` (`{ messageText: string, extra: HandshakeExtraV1, guard: { issues: GuardIssue[], blocking: boolean } }`).
   - Translates into **every channel member's language** (D-021: Three languages, one room). If sender and recipient share the same language, `tr[lang]` uses original text without latency.
   - Guaranteed resilient: if external translation fails or times out, it gracefully falls back to local dictionary/tags so the message preparation **never** blocks chat.
   - Pure pre-send pipeline: **never** sends over Nexconn and **never** writes transcript rows. Real-time sending remains solely client-side via your Nexconn Web SDK call with the returned `extra`.

2. **Meaning Guard & Tone Guard (D-024):**
   - Rules implemented:
     - `currency`: Flags bare numbers in price contexts and large amounts ("2 lakh", "1500") missing currency symbols. `blocking: true`.
     - `scam_signal`: Flags off-platform chat links (WhatsApp, Telegram) and off-platform payments (wire transfer, gift card). `blocking: true`.
     - `date`: Flags vague delivery terms ("tomorrow", "next week", "in 2-3 days") with advice. `blocking: false`.
     - `unit`: Flags vague quantity terms ("a few items", "some boxes"). `blocking: false`.
     - `tone` (Tone Guard D-024): Flags demanding or aggressive phrasing ("give it to me now", "hurry up") with polite suggestions. `blocking: false` (per D-024, never blocks sending).
   - Multilingual explanations: Every issue provides clear explanation in `en`, `hi`, and `ja`.

3. **CORS Multi-Origin Support (DHRUMIL-009 #4):**
   - `WEB_ORIGIN` now accepts a comma-separated list of origins (e.g. `http://localhost:3000,http://127.0.0.1:3000`). You can test both sides of a marketplace chat on your local machine simultaneously.

4. **Listing Cursor Boundary Fix (DHRUMIL-007 #1):**
   - Fixed `getListings` cursor assignment to use `resultItems[resultItems.length - 1].id` so listing #21 at page boundary is never skipped.

**Unblocks:** Your composer call to `POST /api/messages/prepare` in DHRUMIL-T05.
**Next up:** AKSHAT-T07 (`POST /api/cases`, `GET /api/agent/queue`, claim, resolve).


### AKSHAT-008 · DONE · P1 · 2026-11-05
**To:** Dhrumil
**Re:** DHRUMIL-010, DHRUMIL-011
**Task:** AKSHAT-T07 (unblocks DHRUMIL-T06, DHRUMIL-T07 live integration)
**Subject:** Cases & Escalation API live (`/api/cases`, `/api/agent/queue`, claim, resolve)

AKSHAT-T07 is complete, tested, and verified (11/11 case integration tests passing; all contracts, unit, and web tests green).

**What is ready for you:**
1. `POST /api/cases` — Authenticated (`Authorization: Bearer <sessionToken>`).
   - Body: `{ channelId: string, reason: CaseReason, note?: string }`.
   - **Idempotent per chat (DHRUMIL-010 #1):** If the chat already has an active (open or claimed) case, returns that case directly (200 OK) instead of creating a duplicate.
   - **Real Nexconn group channel:** Generates `groupChannelId = grp_c_<nanoid>` and creates it server-side with buyer + seller as initial members. Your UI can open `GroupChannel(groupChannelId)` immediately upon return.
   - **Deal snapshot (D-018):** Automatically snapshots the latest agreed deal on the channel and freezes it in `case.dealSnapshot`.
   - **SLA tracking:** Sets `slaDueAt` to 15 minutes from creation.
2. `GET /api/agent/queue` — Authenticated (Agents only, 403 `FORBIDDEN` otherwise).
   - Returns `{ items: Case[] }` containing non-resolved cases.
   - Ordered by: open cases first, language match preference (routing v0 per ARCHITECTURE §4.4), then `slaDueAt` ascending.
3. `POST /api/cases/:id/claim` — Authenticated (Agents only).
   - Atomic claim.
   - **Idempotent double-tap (DHRUMIL-011 #2):** Returns 200 OK with the case if the same agent re-claims.
   - **Claim race protection:** Returns 409 `CASE_ALREADY_CLAIMED` if another agent has already claimed it.
   - **Adds agent to Nexconn group:** Calls `joinGroupChannel` to add the claiming agent to `groupChannelId` so the console can chat immediately.
4. `POST /api/cases/:id/resolve` — Authenticated (Claiming agent only, 403 `FORBIDDEN` otherwise).
   - Body: `{ resolution: string }`.
   - Transitions case to `status: "resolved"`, updates `resolution` and `resolvedAt`.
5. `GET /api/cases/:id` — Authenticated.
   - Permitted for: the case's buyer, the case's seller, or any support agent (403 for intruders).
   - Returns `{ case: Case, transcript: TranscriptLine[], summary: CaseSummary }`.
6. **Chat Header Badge (DHRUMIL-010 #6):**
   - Added `openCaseId?: string` to `ChatDetailResponse` (C3). When a case is active on a chat, `GET /api/chats/:id` returns its `openCaseId` so the chat header can show "Help requested · View".

**Action on your side:**
You can now safely remove `"/api/cases"` and `"/api/agent"` from `NOT_LIVE` in `apps/web/src/lib/api/client.ts` and test the live Golden Path end-to-end!

**Next up:** AKSHAT-T08 (NexConn webhooks, transcript audit storage with `shownTo` D-022, and AI summaries).


### AKSHAT-009 · DONE · P1 · 2026-11-05
**To:** Dhrumil (cc: Humans)
**Task:** AKSHAT-T08, AKSHAT-T12, AKSHAT-T13, AKSHAT-T15, AKSHAT-T09
**Subject:** Complete Backend Live: Webhooks, Deals, Handshake Seal, Demo Sandbox & Golden Path 100% Green

All backend development phases (AKSHAT-T01 through AKSHAT-T15) are now completely implemented, integrated, tested, and verified!

**What is ready and live in the backend:**

1. **Deals & Handshake Seal (AKSHAT-T12, AKSHAT-T15, D-023):**
   - `POST /api/deals/extract`: Accepts `{ channelId }`. Auto-extracts negotiated price, delivery method (pickup vs shipping), item titles and conditions across all 8 supported languages. Returns `{ deal }`.
   - `POST /api/deals/:id/agree`: Mutual agreement endpoint. When both buyer and seller agree, the deal is frozen into `status: "agreed"` and a cryptographically unguessable `sealCode` (`s_<hex>`) is minted.
   - `GET /api/seals/:code?lang=`: **Public unauthenticated** seal verification endpoint (D-023). Returns `{ deal, sealedAt, buyer: { displayName }, seller: { displayName } }`. 404 `SEAL_NOT_FOUND` if unknown or unsealed.
   - Added `DealAgreeResponseSchema` & `DealResponseSchema` to `@convocart/contracts`.

2. **Nexconn Webhook Ingestion & "Show Me What They Saw" (AKSHAT-T08, D-022):**
   - `POST /api/webhooks/nexconn`: Implements official Nexconn SHA-1 signature verification (`Signature = SHA1(AppSecret + Nonce + Timestamp)`) with ±5 minute clock skew enforcement.
   - Anti-replay nonce protection via `webhook_nonces` database table.
   - Persists conversation messages into `transcript_lines` with per-member `shownTo` records (D-022) capturing the exact language and translated text that was rendered for each participant.
   - Automatic off-platform scam signal detection.

3. **Judge Sandbox & Demo Sessions (AKSHAT-T13, D-015):**
   - `POST /api/demo/session`: Accepts `{ as: "buyer" | "seller" | "agent" }`.
   - Conforms strictly to D-015: reuses a fixed set of seeded identities (`demo_u_buyer`, `demo_u_seller`, `demo_u_agent`) with seeded vintage watch listing and chat. Guarantees **never** creating throwaway Nexconn accounts per click.
   - Returns full `AuthResponse` (`sessionToken`, `user`, `nexconn`).

4. **Golden Path Automated End-to-End Smoke Test (AKSHAT-T09):**
   - Added `"smoke": "vitest run test/golden-path.test.ts"` to `apps/server/package.json` and `"smoke": "pnpm --filter @convocart/server smoke"` to workspace root `package.json`.
   - Scripted test exercises the complete 8-stage journey: onboarding, listing creation & translated browse, chat opening, AI message preparation & tone guard, webhook ingestion, deal extraction & mutual agreement, Handshake Seal public lookup, support dispute escalation & agent claim/resolution, and demo sandbox.
   - Runs and passes 100% green: `pnpm smoke`.

5. **Full Repository Verification:**
   - Monorepo Typecheck: `pnpm run typecheck` (0 errors across contracts, server, and web).
   - Monorepo Production Build: `pnpm run build` (0 errors; Next.js 16 and Fastify build cleanly).
   - Supabase Row-Level Security: audited and prepared in `infra/supabase/rls_policies.sql` for all 9 application tables.

**Action for Dhrumil:**
You can now safely switch all frontend calls (Listings, Chats, Messages Prepare, Deals, Handshake Seal, Cases, Agent Queue, and Demo Fast Login) to the live backend.
