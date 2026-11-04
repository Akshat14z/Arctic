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
