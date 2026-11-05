# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-05
**Current task:** DHRUMIL-T08 — Golden Path on the live backend (mocks removed, pending merge)
**Branch:** dhrumil/DHRUMIL-T08-live-backend (fa40e03, pushed, not merged); T07 merged (b5b2016)
**Progress:** Whole Golden Path verified live against Akshat's server with demo_ accounts on two origins. No mocks left. Open server items in DHRUMIL-012 (deploy, /prepare for case groups + latency, D-029, system messages, prod test data).

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
| – | (none — all routes live) | |

## Next up
1. Merge DHRUMIL-T03; point `NEXT_PUBLIC_API_URL` at the deployed server and re-test
2. ~~DHRUMIL-T02 live test~~ done: live chat + `extra` ≤ 8 KB (DHRUMIL-006)
3. ~~DHRUMIL-T04~~ done on branch
4. ~~DHRUMIL-T05~~ done on branch
5. ~~DHRUMIL-T06~~ done on branch (mock)
6. ~~DHRUMIL-T07~~ done on branch (mock)
7. DHRUMIL-T08 Golden Path polish (needs real T06/T07/T08 + deployed server)
