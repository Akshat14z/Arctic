# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-05
**Current task:** DHRUMIL-T03 — Onboarding: name + language → guest session
**Branch:** dhrumil/DHRUMIL-T03-onboarding (761402b, pushed, not merged)
**Progress:** Onboarding works end to end against a contract-shaped mock: sign-in, refresh-safe session, sign out, friendly network error, safe `?next=` redirect. Checked on phone width, light + dark. Swaps to the real `/api/auth/guest` as soon as the server URL exists.

## Done since last update
- DHRUMIL-T02 SDK module + `/spike` merged to main (46ef0d7); live test still pending
- DHRUMIL-T03 onboarding (branch above): `/onboarding`, `lib/api` client (zod-validated, friendly errors), `lib/session`, home signed-in state, `<html lang>`
- DHRUMIL-004 REVIEW (chat channel scoping, S2) and DHRUMIL-005 REQUEST (deploy server, P0)

## Blocked on
- DHRUMIL-005: deployed server URL (or 2 test tokens) — needed for the DHRUMIL-T02 live test before the D-012 deadline (night of Nov 6) and to drop the auth mock
- DHRUMIL-004: decision on chat channel scoping before DHRUMIL-T05's conversation view

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| `apps/web/src/mocks/api.ts` (`POST /api/auth/guest`, `GET /api/me`) | real server | server deployed → set `NEXT_PUBLIC_API_URL` |
| Pasted App Key/token in `/spike` | `/api/auth/guest` credentials | server deployed |

## Next up
1. Merge DHRUMIL-T03; point `NEXT_PUBLIC_API_URL` at the deployed server and re-test
2. DHRUMIL-T02 live two-browser test (+ `extra` size)
3. DHRUMIL-T04 listings UI (Akshat's routes are ready, AKSHAT-005)
