# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-05
**Current task:** DHRUMIL-T04 — Listings: browse, search, create, detail (done, pending merge)
**Branch:** dhrumil/DHRUMIL-T04-listings (6ad129b, pushed, not merged)
**Progress:** Listings UI works against Akshat's real server (browse, search, paging, detail hi/ja, not-found, sign-in gate, validation, create). Found a server paging bug + prod test fixtures (DHRUMIL-007).

## Done since last update
- DHRUMIL-T02 SDK module + `/spike` merged to main (46ef0d7); live test still pending
- DHRUMIL-T03 onboarding (branch above): `/onboarding`, `lib/api` client (zod-validated, friendly errors), `lib/session`, home signed-in state, `<html lang>`
- DHRUMIL-004 REVIEW (chat channel scoping, S2) and DHRUMIL-005 REQUEST (deploy server, P0)

## Blocked on
- DHRUMIL-005: deployed server URL — needed for Vercel/Golden Path and to drop the auth mock in deployed builds (D-012 already met locally, DHRUMIL-006)
- DHRUMIL-004: decision on chat channel scoping before DHRUMIL-T05's conversation view

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| `apps/web/src/mocks/api.ts` (`POST /api/auth/guest`, `GET /api/me`) | real server | server deployed → set `NEXT_PUBLIC_API_URL` |
| Pasted App Key/token in `/spike` | `/api/auth/guest` credentials | server deployed |

## Next up
1. Merge DHRUMIL-T03; point `NEXT_PUBLIC_API_URL` at the deployed server and re-test
2. ~~DHRUMIL-T02 live test~~ done: live chat + `extra` ≤ 8 KB (DHRUMIL-006)
3. ~~DHRUMIL-T04~~ done on branch
4. DHRUMIL-T05 chat — after DHRUMIL-004 (channel scoping) is decided
