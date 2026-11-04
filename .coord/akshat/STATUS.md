# Agent Akshat — Status

Writer: **Agent Akshat only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Dhrumil and the humans read it to know where you are.

**Last updated:** 2026-11-04 15:45 IST
**Current task:** AKSHAT-T04 (Next)
**Branch:** main (AKSHAT-T03 merged at commit `f8ef76d`)
**Progress:** Completed AKSHAT-T03: Implemented Guest and Agent authentication (`POST /api/auth/guest`, `POST /api/auth/agent`), session persistence in Supabase PostgreSQL via Prisma with SHA-256 token hashing, live Nexconn connection token issuance via Singapore gateway (`api.sg-light-api.com`), and profile endpoints (`GET /api/me`, `PATCH /api/me`). All 24 workspace tests passing.

## Done since last update
- Verified live Nexconn API regional domain: Singapore (`SG`) data center domain is `https://api.sg-light-api.com` (primary) and `https://api-b.sg-light-api.com` (backup). Configured as defaults in `apps/server/src/config.ts`.
- Resolved PgBouncer compatibility in Supabase: Added `?pgbouncer=true` to pooler connection string, preventing prepared statement collisions (`42P05`).
- Auth & Sessions service: Created `apps/server/src/services/auth.service.ts` with `loginGuest`, `loginAgent`, `validateSession`, `getMe`, `updateMe`.
- Auth middleware: Created `apps/server/src/middleware/auth.ts` enforcing `Authorization: Bearer <sessionToken>`.
- Auth routes: Created `apps/server/src/routes/auth.ts` (`POST /api/auth/guest`, `POST /api/auth/agent`) and `apps/server/src/routes/me.ts` (`GET /api/me`, `PATCH /api/me`).
- Auth tests: Created `apps/server/test/auth.test.ts` with 8 comprehensive integration tests covering guest onboarding, agent authentication with access code verification, 403 `BAD_AGENT_CODE`, 401 `UNAUTHORIZED`, session validation, and profile updates.
- Untracked `tsconfig.tsbuildinfo` per DHRUMIL-001 review and added `*.tsbuildinfo` to `.gitignore`.
- Appended `AKSHAT-004 · DONE` to `OUTBOX.md` unblocking Dhrumil's onboarding UI (DHRUMIL-T03) and live `/spike` testing.

## Blocked on
- None. Database and Nexconn credentials are live and verified.

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| Vitest userApi mock in tests | Live Nexconn Server SDK HTTP calls in CI/test runs | Optional (keeps automated tests <2s offline) |

## Next up
1. AKSHAT-T04: Listings CRUD & translated cache endpoints (`POST /api/listings`, `GET /api/listings`, `GET /api/listings/:id`).
2. AKSHAT-T05: Chat endpoints (`POST /api/chats`, `GET /api/chats`).
