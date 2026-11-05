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
| 9 | Live: guest token from AKSHAT `/api/auth/guest` connects (SG, ~3 s), 2 users chat both ways in DirectChannel, `extra` intact | live, /spike | 2026-11-05 |
| 10 | `extra` limit: 8 KB ok, 16 KB fails with code 20115 (ASCII; budget ~8 KB for text+extra) | live probe | 2026-11-05 |
| 11 | Team test accounts on prod (exclude from traction): u_0bed9289e709, u_319b2e85b23c, u_7de228bd64e3 | created with human OK | 2026-11-05 |
| 12 | Listings API: `lang` = original language; translations only from cache (none yet); paging drops item 21 (server bug, DHRUMIL-007) | live | 2026-11-05 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| DHRUMIL-007 | Akshat + Humans | REVIEW: paging bug, prod test fixtures, displayLang request | waiting on them |
| DHRUMIL-006 | Akshat + Humans | FINDING: live chat works, extra limit, team test ids, local-run gotchas | FYI |
| DHRUMIL-005 | Akshat | REQUEST: deploy server (spike part satisfied locally; deployed URL still needed) | waiting on them |
| DHRUMIL-004 | Akshat + Humans | REVIEW S2: listing-scoped channelId vs pair-scoped DirectChannel; options (a) group per chat (b) listingId in extra | waiting on them |
| AKSHAT-004/005/006 | Akshat | DONE auth, listings, chats | verify against deployed server once DHRUMIL-005 lands |
| AKSHAT-003 | Humans | DECISION: Supabase instead of Neon (D-004) | waiting on humans |
| DHRUMIL-003 | Akshat + Humans | FINDING: SDK facts + built-in translation question | FYI; humans decide on item 6 |
| DHRUMIL-002 | Akshat | HEADS-UP: apps/web, lockfile, pnpm 12 gotchas | FYI, no reply needed |
| DHRUMIL-001 | Akshat + Humans | REVIEW of AKSHAT-T01 | closed (S1 + tsbuildinfo fixed in AKSHAT-002; D-028) |

## Gotchas & lessons
- Cache Components: `useParams()`/URL data in a client component must sit under `<Suspense>` or `next build` fails prerendering.
- Intl: pin `numberingSystem: "latn"` — bn/mr locales default to native digits.
- Run the server locally with `.claude/launch.json` "server" (tsx `--env-file=<repo>/.env`); web uses `apps/web/.env.local` `NEXT_PUBLIC_API_URL=http://localhost:4001` (gitignored).
- Never paste tokens into pages myself: let the app obtain them from `/api/auth/guest`.
- `useSyncExternalStore` getSnapshot must return a stable reference: `lib/session.ts` caches by the raw localStorage string.
- Don't read `navigator`/`localStorage` during render (hydration mismatch with static prerender); do it in effects or via `useSyncExternalStore` with a server snapshot.
- With cacheComponents, hidden routes stay in the DOM (Activity): accessibility-tree searches can show elements from a previous page.
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

### 2026-11-05 · session 3
- Did: pulled AKSHAT-T02…T05; DHRUMIL-004 REVIEW + DHRUMIL-005 REQUEST; merged DHRUMIL-T02 code; built DHRUMIL-T03 onboarding (branch pushed, 761402b).
- Learned: Nexconn DirectChannel is pair-scoped, so listing-scoped chat ids collide (DHRUMIL-004).
- AI tools used: Claude Code (Claude Opus 5.5) for review, onboarding UI, browser tests.
- Next: merge T03, wire real API once deployed, T02 live test, T04 listings.

### 2026-11-05 · session 3b
- Did: verified H-02 — local server + real /api/auth/guest → two users chatted live on prod Nexconn; measured extra limit; DHRUMIL-006.
- AI tools used: Claude Code (Claude Opus 5.5) for env check (names only), spike rework, live browser test.
- Next: merge live-test branch; DHRUMIL-T04 listings against Akshat's real routes.

### 2026-11-05 · session 3c
- Did: DHRUMIL-T04 listings UI (branch 6ad129b), tested live incl. create+delete; DHRUMIL-007 REVIEW.
- AI tools used: Claude Code (Claude Opus 5.5) for listings UI and live browser tests.
- Next: merge T04; DHRUMIL-T05 waits on DHRUMIL-004 decision (channel scoping).
