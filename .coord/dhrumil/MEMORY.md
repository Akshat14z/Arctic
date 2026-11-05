# Agent Dhrumil — Memory

Writer: **Agent Dhrumil only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Akshat's outbox
`AKSHAT-006` ← update to the last message ID you read (e.g. `AKSHAT-012`) at the end of every `/start`.

## Verified facts (SDK behavior, APIs, limits, gotchas)
| # | Fact | How verified | Date |
|---|---|---|---|
| 1 | Text messages carry `extra?: string` via `SendTextMessageParams({ text, extra })`; size limit unknown | @nexconn/chat 26.2.1 d.ts | 2026-11-04 |
| 2 | `metadata?: Record<string,string>` on send + `message.setMetadata()` after send | d.ts | 2026-11-04 |
| 3 | `new DirectChannel(otherUserId)` — no server-side creation; history via `BaseChannel.createMessagesQuery(...).loadNextPage()` | d.ts | 2026-11-04 |
| 4 | `NCEngine.initialize({appKey, areaCode, logLevel})` → `NCEngine.connect({token})` → `RCResult<{userId}>`; AreaCode SG=2 NA=3 SA=5 OM=6 BJ=1 | d.ts | 2026-11-04 |
| 5 | Statuses CONNECTED 0 / CONNECTING 1 / DISCONNECTED 2 / SUSPENDED 3 (auto-retry 5 s); handler key is `onConnectionStatusChanged` (JSDoc example is wrong) | d.ts | 2026-11-04 |
| 6 | Bad App Key/token → connect fails with code 31004 | live, /spike | 2026-11-04 |
| 7 | Built-in `NCEngine.translateModule` (translateMessages/Texts, setTranslationLanguage, auto-translate, per-channel strategy) | d.ts | 2026-11-04 |
| 8 | `GroupChannel.createGroup` exists client-side | d.ts | 2026-11-04 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| DHRUMIL-005 | Akshat | REQUEST P0: deploy server or send 2 test tokens (D-012, Nov 6) | waiting on them |
| DHRUMIL-004 | Akshat + Humans | REVIEW S2: listing-scoped channelId vs pair-scoped DirectChannel; options (a) group per chat (b) listingId in extra | waiting on them |
| AKSHAT-004/005/006 | Akshat | DONE auth, listings, chats | verify against deployed server once DHRUMIL-005 lands |
| AKSHAT-003 | Humans | DECISION: Supabase instead of Neon (D-004) | waiting on humans |
| DHRUMIL-003 | Akshat + Humans | FINDING: SDK facts + built-in translation question | FYI; humans decide on item 6 |
| DHRUMIL-002 | Akshat | HEADS-UP: apps/web, lockfile, pnpm 12 gotchas | FYI, no reply needed |
| DHRUMIL-001 | Akshat + Humans | REVIEW of AKSHAT-T01 | closed (S1 + tsbuildinfo fixed in AKSHAT-002; D-028) |

## Gotchas & lessons
- pnpm 12: run as `node ~/.cache/node/corepack/v1/pnpm/12.16.1/bin/pnpm.mjs` (corepack on Node 22.23 looks for pnpm.cjs and fails).
- pnpm 12 `minimumReleaseAge`: packages < ~1 day old fail install, and pnpm silently writes an exclude list into `pnpm-workspace.yaml` (Akshat's file). Revert it and pin an older version.
- Next 16 (bundled docs in `apps/web/node_modules/next/dist/docs/`): `error.tsx` gets `retry()` (preferred) not just `reset()`; `cacheComponents` keeps hidden routes mounted via `<Activity>` and cleans up/re-runs effects — Nexconn listeners must be set up in effects with cleanup, or live in a module outside routes.
- `@convocart/contracts` exports from `dist/`: build it first (`pnpm --filter "@convocart/web..." run build`).

## Session log (append-only, newest at bottom, 3–5 lines per session)
<!-- ### 2026-11-03 · session 1
- Did: …
- Learned: …
- AI tools used: Claude Code (…)
- Next: … -->

### 2026-11-03 · session 1
- Did: renamed kit to dhrumil/akshat, wrote PRODUCT_BRIEF/PRIMER/ARCHITECTURE fixes + USP tiers (with humans), DHRUMIL-001 review, DHRUMIL-T01 scaffold (branch pushed).
- Learned: pnpm 12 release-age policy + corepack gotcha; Next 16 retry()/Activity behavior.
- AI tools used: Claude Code (Claude Opus 5.5) for planning docs, research, scaffold, browser checks.
- Next: Vercel deploy + merge DHRUMIL-T01, then DHRUMIL-T02 SDK spike.

### 2026-11-04 · session 2
- Did: DHRUMIL-T02 code — SDK module `src/lib/nexconn` + `/spike` page (branch pushed, 794b8e0); DHRUMIL-003 FINDING.
- Learned: see verified facts 1-8; SDK loads fine under Next 16 SSR/prerender.
- AI tools used: Claude Code (Claude Opus 5.5) for reading SDK type defs, module + spike, browser check.
- Next: live two-browser test once H-02 app + tokens exist; D-012 deadline is tonight.
