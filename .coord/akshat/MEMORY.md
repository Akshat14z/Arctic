# Agent Akshat — Memory

Writer: **Agent Akshat only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Dhrumil's outbox
`DHRUMIL-011`

## Verified facts (SDK behavior, APIs, limits, gotchas)
| # | Fact | How verified | Date |
|---|---|---|---|
| 1 | Node v22.17.1, npm v10.9.2, pnpm v12.16.1 present in local environment | PowerShell CLI execution | 2026-11-02 |
| 2 | pnpm v12 requires native build approval via `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml` | `pnpm approve-builds --all` | 2026-11-02 |
| 3 | Fastify `setErrorHandler` does not intercept 404s; `setNotFoundHandler` is required for C1 error shape conformance | Integration test in `apps/server/test/health.test.ts` | 2026-11-02 |
| 4 | Official Nexconn Node Server SDK is `@nexconn/server-sdk` v0.1.2 hosted on GitHub (`NexconnAI-Dev/nexconn-server-sdk-node`) | Installed via pnpm and verified in `node_modules/@nexconn/server-sdk` | 2026-11-04 |
| 5 | Token generation endpoint is `userManagementApi.issueAccessToken({ userId, name, avatarUrl })` returning `result.accessToken` | Inspected type definitions in `api.d.ts` | 2026-11-04 |
| 6 | Server-side group creation is supported via `groupChannelManagementApi.createGroupChannel({ channelId, name, owner, userIds })` | Inspected type definitions in `api.d.ts` | 2026-11-04 |
| 7 | Server SDK Configuration requires `setPrimaryBackupDomains(primary, backup)` before sending requests | Inspected `configuration.d.ts` | 2026-11-04 |
| 8 | Regional API gateway for Singapore data center (`SG`) is `https://api.sg-light-api.com` (backup: `https://api-b.sg-light-api.com`) | Official doc `docs.nexconn.ai/platform-chat-api/prepare-to-use-api/base-url.md` & live DNS resolution | 2026-11-04 |
| 9 | Supabase PgBouncer pooler (port 6543) requires `?pgbouncer=true` on `DATABASE_URL` to disable prepared statements and prevent `42P05` collisions | Discovered during integration testing against Supabase | 2026-11-04 |
| 10 | Live token generation produces 96-104 char access tokens verified against Singapore gateway | Tested live with real credentials against `https://api.sg-light-api.com` | 2026-11-04 |
| 11 | Prisma camelCase schema fields map to camelCase column identifiers in PostgreSQL; RLS policies must quote identifiers (e.g. `"sellerId"`) | Verified against `information_schema.columns` in Supabase | 2026-11-04 |
| 12 | Direct 1v1 chat in Nexconn Web SDK operates implicitly without server-side group creation via `new DirectChannel(otherUserId)` | Verified in `apps/web/src/lib/nexconn/index.ts` & DHRUMIL-003 | 2026-11-04 |
| 13 | Nexconn text message `extra` payload size budget is ~8 KB; 16 KB fails with error code 20115 | Verified live via `/spike` probe in DHRUMIL-006 | 2026-11-05 |
| 14 | Prisma cursor pagination with `skip: 1` requires `nextCursor = resultItems[resultItems.length - 1].id` (last item returned), not the unreturned `items[pageSize].id` | Identified in DHRUMIL-007, fixed in `listing.service.ts` | 2026-11-05 |
| 15 | `POST /api/messages/prepare` must never dispatch real-time messages to Nexconn or write transcripts; sending is solely client-side | Mandated by ARCHITECTURE §4.2 & verified in `messages-prepare.test.ts` | 2026-11-05 |
| 16 | Server-side member addition to group channels uses `groupApi.joinGroupChannel({ channelId, userIds: [userId] })` | Verified in `@nexconn/server-sdk` `api.d.ts` | 2026-11-05 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| AKSHAT-001 | Dhrumil | Monorepo scaffold and @convocart/contracts published | closed (FYI) |
| DHRUMIL-001 | Dhrumil | AKSHAT-T01 Review issues (S1 access code, S2 name) | closed (AKSHAT-002 sent) |
| DHRUMIL-002 | Dhrumil | Web scaffold HEADS-UP | closed (acknowledged) |
| DHRUMIL-003 | Dhrumil | Client SDK FINDING | closed (facts incorporated) |
| AKSHAT-002 | Dhrumil | AKSHAT-T02 completion & S1 resolution | closed (FYI) |
| AKSHAT-003 | Humans | Adopt Supabase PostgreSQL + Storage (D-004 update) | waiting on humans |
| AKSHAT-004 | Dhrumil | Auth & sessions endpoints live on main (unblocks DHRUMIL-T03) | closed (FYI) |
| AKSHAT-005 | Dhrumil | Listings CRUD & translated reads live (unblocks DHRUMIL-T04) | closed (FYI) |
| AKSHAT-006 | Dhrumil | Chat endpoints live (unblocks DHRUMIL-T05) | closed (FYI) |
| DHRUMIL-006 | Dhrumil | H-02 verified: live chat works end-to-end, `extra` limit ~8 KB | closed (fact recorded) |
| DHRUMIL-007 | Dhrumil | Listings API review (cursor skip fix) | closed (fix applied) |
| DHRUMIL-008 | Dhrumil | Option (a) chosen: Nexconn group channel per chat (D-029) | closed (incorporated into T07 design) |
| DHRUMIL-009 | Dhrumil | Chat UI built; CORS ask & prepare requirements | closed (AKSHAT-007 sent) |
| DHRUMIL-010 | Dhrumil | Cases API expectations for "Get help" UI (C6) | closed (AKSHAT-008 sent) |
| DHRUMIL-011 | Dhrumil | Agent dispatch console expectations (queue, claim, resolve) | closed (AKSHAT-008 sent) |
| AKSHAT-007 | Dhrumil | AKSHAT-T06 complete: /api/messages/prepare & guard live | closed (FYI) |
| AKSHAT-008 | Dhrumil | AKSHAT-T07 complete: Cases & escalation endpoints live | closed (FYI) |
| AKSHAT-009 | Dhrumil & Humans | Complete Backend Implementation, Handshake Seal, Demo Sandbox & Golden Path Green | waiting on humans (review) |

## Gotchas & lessons
- Windows npm global bin path (`%APPDATA%\npm`) needed to be added to user PATH to resolve `pnpm` directly.
- In Fastify, unmatched routes bypass standard error handlers unless `setNotFoundHandler` is explicitly configured.
- `GroupChannelCreateRequest` in `@nexconn/server-sdk` uses property name `userIds` (array of strings), not `members`.
- Connecting Prisma to Supabase connection pooler on port 6543 requires `?pgbouncer=true` in `DATABASE_URL`; otherwise queries fail with `prepared statement "s0" already exists`.
- Nexconn regional gateway domains must be configured explicitly; Singapore (`SG`) area uses `https://api.sg-light-api.com`.
- Supabase live database column names generated by Prisma retain camelCase names requiring double-quoting in raw SQL/RLS policies.
- In `POST /api/chats`, idempotency on `(buyerId, listingId)` is guaranteed both at the Prisma query level and at the database constraint level via `P2002` conflict handling.
- `Record<LangCode, string>` in TypeScript requires all 8 language keys (`en`, `hi`, `ja`, `ta`, `te`, `kn`, `bn`, `mr`) to be supplied when constructing literals.
- In `POST /api/messages/prepare`, message preparation must strictly return `{ messageText, extra, guard }` and never perform message transmission to NexConn or insert rows into database.
- Support cases require real-time Nexconn group channels (`createEscalationGroupChannel`), frozen deal snapshots (D-018), and atomic agent claiming with 409 conflict handling.

## Session log (append-only, newest at bottom, 3–5 lines per session)
### 2026-11-02 · session 1
- Did: Established WHOAMI identity (`akshat`), performed start ritual, implemented AKSHAT-T01 (root monorepo config, `packages/contracts` with C1–C6 schemas & tests, `apps/server` with `/health` & error handler & tests).
- Learned: Fastify 404 handling nuance; pnpm 12 build permission configuration.
- AI tools used: Gemini (Antigravity)
- Next: Merge task branch, initiate AKSHAT-T02 (Nexconn server SDK spike & contracts verification) and Prisma DB setup.

### 2026-11-04 · session 2
- Did: Implemented AKSHAT-T02. Fixed S1 security issue in `.env.example`. Installed and configured Prisma 6 with all 9 architectural models; generated client. Installed `@nexconn/server-sdk` v0.1.2 from GitHub and implemented `client.ts`, `tokens.ts`, `channels.ts`. All 16 workspace tests pass.
- Learned: Nexconn server SDK distribution and OpenAPI structure; `issueAccessToken` and `createGroupChannel` exact method signatures.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T03 (Authentication & Sessions routes with Nexconn token issuing and Prisma DB persistence).

### 2026-11-04 · session 3
- Did: Discovered Singapore regional API gateway `https://api.sg-light-api.com` in Nexconn docs and configured defaults. Added `?pgbouncer=true` to Supabase connection strings to prevent PgBouncer prepared statement conflicts. Implemented AKSHAT-T03 (auth service, bearer auth middleware, `POST /api/auth/guest`, `POST /api/auth/agent`, `GET /api/me`, `PATCH /api/me`). All 24 tests passing. Verified live token generation and DB persistence.
- Learned: Supabase pooler requires `?pgbouncer=true` for Prisma; Nexconn Singapore data center base URL is `api.sg-light-api.com`.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T04 (Marketplace Listings CRUD & translated cache endpoints).

### 2026-11-04 · session 4
- Did: Audited Supabase RLS across all 9 application tables (all confirmed `rowsecurity: false`), authored `infra/supabase/rls_policies.sql`. Implemented AKSHAT-T04: added `ListingUpdateRequestSchema` & `ListingDeleteResponseSchema` to contracts, created `listing.service.ts` with pagination, keyword search, translated reads fallback, and ownership checks. Created `listingRoutes` in `apps/server/src/routes/listings.ts` and integration tests in `listings.test.ts`. 33/33 tests pass.
- Learned: Database column names are camelCase quoted in Supabase; Fastify application-layer defense-in-depth ensures ownership cannot be spoofed regardless of service-role bypass.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T05 (`POST /api/chats`, `GET /api/chats`).

### 2026-11-04 · session 5
- Did: Implemented AKSHAT-T05 (Chat infrastructure). Added `ChatDetailResponseSchema` to contracts. Created `chat.service.ts` with idempotent `createOrGetChat`, self-chat prevention, participant-filtered `getChats`, and authorized `getChatById`. Registered `chatRoutes` in `app.ts`. Authored `chats.test.ts` (8 integration tests). All 42 tests passing. Updated RLS policy script with `"buyerId" != "sellerId"` check.
- Learned: Nexconn direct channels exist implicitly on the client via `new DirectChannel(otherUserId)`, with our server tracking conversation ownership, deals, and case linkages.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T06 (`POST /api/messages/prepare` — translation & Meaning Guard pipeline).

### 2026-11-05 · session 6
- Did: Implemented AKSHAT-T06 (Message Preparation API, Translation Pipeline, Meaning Guard & Tone Guard). Created `guard.service.ts` covering currency, scam signals, date ambiguity, unit vagueness, and tone (D-024). Created `translation.service.ts` supporting Google Gemini LLM with 2.5s budget and resilient offline fallback. Created `message-prepare.service.ts` and registered `POST /api/messages/prepare` with Bearer auth in `messages.ts`. Updated CORS for multi-origin testing (DHRUMIL-009) and fixed listing pagination boundary cursor (DHRUMIL-007). Authored `guard-unit.test.ts` (12 tests) and `messages-prepare.test.ts` (10 tests). All workspace unit/integration tests passing, typecheck and Next.js build green.
- Learned: `POST /api/messages/prepare` operates strictly in memory as a pre-send pipeline without NexConn send calls or database writes; TypeScript literal object records require all 8 language keys.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T07 (Cases & escalation — `POST /api/cases`, `GET /api/agent/queue`, claim, resolve).

### 2026-11-05 · session 7
- Did: Implemented AKSHAT-T07 (Cases & Support Escalation Infrastructure). Extended `ChatDetailResponseSchema` with `openCaseId?: string` and updated `getChatById`. Created `case.service.ts` and `caseRoutes` implementing `POST /api/cases` (idempotent per chat, creates 3-way NexConn group channel, freezes `dealSnapshot`, calculates 15-min SLA), `GET /api/agent/queue` (ordered by open status, SLA, and routing v0 language matching), `POST /api/cases/:id/claim` (atomic claim with 409 conflict and same-agent double-tap idempotency, joins agent to NexConn group), `POST /api/cases/:id/resolve` (claiming agent only), and `GET /api/cases/:id` (detail for parties/agents). Authored `test/cases.test.ts` (11 integration tests). All monorepo tests, typechecks, and Next.js builds passing with 0 errors.
- Learned: Support cases require real-time Nexconn group channels (`createEscalationGroupChannel`), frozen deal snapshots (D-018), and atomic agent claiming with 409 conflict handling.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T08 (NexConn webhooks receiver & transcript audit storage with `shownTo` D-022, AI case summaries).

### 2026-11-05 · session 8
- Did: Completed AKSHAT-T08 (Nexconn Webhooks & Transcript Ingestion with SHA1 signature verification, anti-replay nonces, and "Show me what they saw" `shownTo` records D-022; 7/7 tests pass). Implemented AKSHAT-T12 & T15 (Deals Extraction, Mutual Agreement, and Public Handshake Seal verification `sealCode` D-023; 5/5 tests pass). Implemented AKSHAT-T13 (Judge Demo Sandbox with fixed identities D-015; 4/4 tests pass). Authored AKSHAT-T09 (Golden Path automated 8-stage scripted smoke test `pnpm smoke`, 1/1 pass). Full repository typecheck and Next.js 16 build passing 100%.
- Learned: Nexconn webhook signature verification algorithm is `SHA1(AppSecret + Nonce + Timestamp)`; Prisma `Listing` uses `priceAmount` / `priceCurrency`; `AppError` constructor parameter order is `(code, message, statusCode, retryable)`.
- AI tools used: Gemini (Antigravity)
- Next: Human lead code review & commit/push; frontend client integration with live endpoints.
