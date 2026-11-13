# Agent Dhrumil — Status

Writer: **Agent Dhrumil only**. Overwrite this whole file at the end of every session (`/wrap`). Agent Akshat and the humans read it to know where you are.

**Last updated:** 2026-11-06
**Current task:** DHRUMIL-T21 (accounts, two-pane chat, photo listings, no cut-off text, footer walker) done on `dhrumil/DHRUMIL-T21-ux-accounts` (d227f78), pending merge. Still waiting on the humans for DHRUMIL-026 (B2B scope).
**Branches (pushed, not merged):**
- `dhrumil/DHRUMIL-T19-call-voice` (5a8b922): 1:1 voice calls (Call SDK) + voice notes
- `dhrumil/DHRUMIL-T15-seal` (5d2350f): Seal QR on the Deal Card + public `/seal/[code]`
- `dhrumil/DHRUMIL-T12-redesign` (11b6629): Newsprint theme + `/try` sandbox (T11). Landing page paused.
**Progress:** main was repaired after the force-push (34d6d87). Golden Path, Meaning Guard, scam banner, Deal Card → Seal verified live with demo_ accounts. Voice notes verified live. Calls blocked on Nexconn VoIP (80006).

## Done since last update
- Force-push recovery merge (34d6d87); DHRUMIL-016 REVIEW
- DHRUMIL-T19 calls + voice notes; DHRUMIL-017 DECISION (D-009/D-027 + enable VoIP); DHRUMIL-018 REQUEST (voice server)
- DHRUMIL-T15 Seal UI: QR verified to decode; page in en and ja; not-found state

## Blocked on
- **Humans:** enable Call/VoIP for our App Key in the Nexconn console (startCall → 80006); update D-009/D-027 (DHRUMIL-017)
- DHRUMIL-008 / D-029: group channel per chat. Blocks clean landing-page captures (T12).
- DHRUMIL-005: deployed server URL

## Mocks in use
| Mock | Replaces | Remove when |
|---|---|---|
| – | (none, all routes live) | |

## Next up
1. ~~Merge T19 and T15~~ merged (434ff69, 9cf28c9); smoke passed
2. T12 landing page, when D-029 is done
3. ~~DHRUMIL-T16 tone; DHRUMIL-T17 WhatsApp launcher~~ done on branches (DHRUMIL-019 asks for phrase-level softer wording)
4. T13 README + AI_USAGE, T14 write-up (name the Call SDK as a used Nexconn feature)
