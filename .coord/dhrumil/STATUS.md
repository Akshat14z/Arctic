# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-05
**Current task:** DHRUMIL-T06 — Get help flow + 3-way case chat (done on mock, pending merge)
**Branch:** dhrumil/DHRUMIL-T06-get-help (547d055, pushed, not merged); T05 merged (76dfed0)
**Progress:** Get help dialog, case page with status polling and participants, 3-way thread wired to the case group. Cases API mocked per route until AKSHAT-T07 (DHRUMIL-010).

## Done since last update
- DHRUMIL-T02 SDK module + `/spike` merged to main (46ef0d7); live test still pending
- DHRUMIL-T03 onboarding (branch above): `/onboarding`, `lib/api` client (zod-validated, friendly errors), `lib/session`, home signed-in state, `<html lang>`
- DHRUMIL-004 REVIEW (chat channel scoping, S2) and DHRUMIL-005 REQUEST (deploy server, P0)

## Blocked on
- DHRUMIL-005: deployed server URL — needed for Vercel/Golden Path and to drop the auth mock in deployed builds (D-012 already met locally, DHRUMIL-006)
- DHRUMIL-008: server creates a group per chat (D-029) — UI already handles it

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| `apps/web/src/mocks/api.ts` (`POST /api/auth/guest`, `GET /api/me`) | real server | server deployed → set `NEXT_PUBLIC_API_URL` |
| `/api/cases*` in `mocks/api.ts` via `NOT_LIVE` | AKSHAT-T07 cases API | AKSHAT-T07 lands (DHRUMIL-010) |

## Next up
1. Merge DHRUMIL-T03; point `NEXT_PUBLIC_API_URL` at the deployed server and re-test
2. ~~DHRUMIL-T02 live test~~ done: live chat + `extra` ≤ 8 KB (DHRUMIL-006)
3. ~~DHRUMIL-T04~~ done on branch
4. ~~DHRUMIL-T05~~ done on branch
5. ~~DHRUMIL-T06~~ done on branch (mock)
6. DHRUMIL-T07 agent console (AKSHAT-T07/T08, mock ok)
