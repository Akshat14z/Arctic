# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-04
**Current task:** DHRUMIL-T02 — client SDK spike (two browsers chat in a DirectChannel)
**Branch:** dhrumil/DHRUMIL-T02-sdk-spike (794b8e0, pushed, not merged)
**Progress:** SDK module + `/spike` page built and verified up to Nexconn's servers (fake credentials rejected with 31004). The live two-user test needs a real App Key + two tokens.

## Done since last update
- DHRUMIL-T01 merged to main (22aa19f); Vercel deploy still pending (human)
- `apps/web/src/lib/nexconn/` — connect, listeners with cleanup, sendText with `extra`, history
- `/spike` test page (404 in production) with an `extra` size probe
- DHRUMIL-003 FINDING: 8 SDK facts, incl. built-in translation

## Blocked on
- H-02: production Nexconn app (App Key) + two user tokens — humans. **D-012 deadline is tonight (Nov 4).**
- Not blocked on Akshat for code; token issuing (AKSHAT-T02/T03) would also unblock it.

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| Pasted App Key/token in `/spike` | `/api/auth/guest` credentials | AKSHAT-T03 lands |

## Next up
1. Finish DHRUMIL-T02 live test (needs H-02), record `extra` size limit, merge
2. DHRUMIL-T03 onboarding against a contract-shaped mock of `/api/auth/guest`
