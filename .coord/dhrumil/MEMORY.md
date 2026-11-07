# Agent Dhrumil — Memory

Writer: **Agent Dhrumil only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Akshat's outbox
`AKSHAT-009` ← update to the last message ID you read (e.g. `AKSHAT-012`) at the end of every `/start`.

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
| 11 | Team accounts on prod (exclude from traction): users u_0bed9289e709, u_319b2e85b23c, u_7de228bd64e3, u_535ef98f9bc0, u_eb6263e6305a (the last was one more than approved: capture script re-created per run); agent u_agent_eb668508c2e8 | created with human OK | 2026-11-05 |
| 13 | Web SDK: `new GroupChannel(id)` to send; history via `new GroupChannelIdentifier(id)` | d.ts 26.2.1 | 2026-11-05 |
| 12 | Listings API: `lang` = original language; translations only from cache (none yet); paging drops item 21 (server bug, DHRUMIL-007) | live | 2026-11-05 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| DHRUMIL-007 | Akshat + Humans | REVIEW: paging bug, prod test fixtures, displayLang request | waiting on them |
| DHRUMIL-006 | Akshat + Humans | FINDING: live chat works, extra limit, team test ids, local-run gotchas | FYI |
| DHRUMIL-005 | Akshat | REQUEST: deploy server (spike part satisfied locally; deployed URL still needed) | waiting on them |
| DHRUMIL-004 | Akshat + Humans | REVIEW S2: channel scoping | closed by humans: D-029 (group per chat) |
| DHRUMIL-015 | Akshat + Humans | REQUEST P0: Gemini timeout/model; D-029 blocks clean demo captures; test data | waiting on them |
| DHRUMIL-014 | Akshat | HEADS-UP: client posts deal_card messages; scam banner; item.ja fallback | FYI |
| DHRUMIL-013 | Akshat + Humans | FINDING: placeholder LLM key → 4 s prepare drops guard; ₹2 lakh suggestion loop; suggestion semantics | waiting on them |
| DHRUMIL-012 | Akshat + Humans | REVIEW P0: deploy, /prepare groups + latency, D-029, system msgs, prod test data, displayLang, traction exclusions, LLM key | waiting on them |
| DHRUMIL-011 | Akshat | REQUEST: queue order, claim idempotent/409, resolve owner-only, agent summary lang + shownTo both sides | closed by AKSHAT-008 (system msgs → DHRUMIL-012 #5) |
| DHRUMIL-010 | Akshat | REQUEST: cases API behaviours for Get help (idempotent, real group, user GET, system msgs, note, openCaseId) | closed by AKSHAT-008 (system msgs → DHRUMIL-012 #5) |
| DHRUMIL-009 | Akshat | HEADS-UP: chat UI ready for D-029; asks: prepare shape, lastMessage via T08, CORS list | waiting on them (#4) |
| DHRUMIL-008 | Akshat | REQUEST P0: implement D-029 in POST /api/chats + channelType "group" | waiting on them |
| AKSHAT-004/005/006 | Akshat | DONE auth, listings, chats | verify against deployed server once DHRUMIL-005 lands |
| AKSHAT-003 | Humans | DECISION: Supabase instead of Neon (D-004) | waiting on humans |
| DHRUMIL-003 | Akshat + Humans | FINDING: SDK facts + built-in translation question | FYI; humans decide on item 6 |
| DHRUMIL-002 | Akshat | HEADS-UP: apps/web, lockfile, pnpm 12 gotchas | FYI, no reply needed |
| DHRUMIL-001 | Akshat + Humans | REVIEW of AKSHAT-T01 | closed (S1 + tsbuildinfo fixed in AKSHAT-002; D-028) |

## Gotchas & lessons
- Capture scripts that create accounts must persist and reuse the session (scratchpad JSON); never re-run a creating script without that.
- Gemini from here: 3.5-flash 5–56 s, flash-lite-latest ~2 s; server timeout 2.5 s → flaky translations until Akshat raises it. Local server runs with LLM_MODEL=gemini-flash-lite-latest (launch.json).
- Memory edits: assert every replace matched; two earlier edits silently didn't.
- Deals: server never sends Nexconn messages; the web sends `deal_card` messages after extract/agree and renders only the latest per deal.id.
- `next start` on :3001 serves the build from when it started — restart web-prod after every `next build`.
- Local server: start with `LLM_API_KEY=` (empty) or every /prepare waits ~4 s on Gemini with the placeholder key and the guard is lost (launch.json server config does this).
- Guard rules are English regexes; demo with English price phrasing ("I can pay 2 lakh for it").
- Two users locally: dev web on :3000 + `next start -p 3001` (launch.json `web-prod`), server with `WEB_ORIGIN=http://localhost:3000,http://localhost:3001`. Don't use `allowedDevOrigins` (Next 16.4.3 reload loop).
- Demo sign-in for tests: `POST /api/demo/session {as: buyer|seller|agent}` → fixed demo_ users (Priya hi, Kenji ja, Sarah en). No new accounts.
- One origin = one session: signing in as an agent replaces the user session in that browser (the sign-in page says so).
- Wide pages: put `data-wide` on the page root; `<main>` widens via `has-[[data-wide]]:max-w-6xl`.
- Per-route mocks: `NOT_LIVE` prefixes in `lib/api/client.ts` go to `mocks/api.ts` even when the real server is set.
- Native `<dialog>` + `showModal()` gives focus trap, Esc and backdrop for free; Tailwind `backdrop:` styles it.
- Effects must not return values: `scrollIntoView()` now returns a Promise in Chromium, so `useEffect(() => el.scrollIntoView())` triggers a React error. Always use braces.
- Two signed-in users in one browser need two origins (localStorage per origin); server CORS only allows WEB_ORIGIN.
- Web tests: `pnpm --filter @convocart/web test` (node:test, `.test.mts`, no deps).
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

### 2026-11-05 · session 3d
- Did: DHRUMIL-T05 chat (branch e93be59): inbox, conversation, composer with /prepare fallback, C4 render + test; D-029 recorded with humans; DHRUMIL-008, DHRUMIL-009.
- AI tools used: Claude Code (Claude Opus 5.5) for chat UI, live tests, render checks.
- Next: merge T05; receiving-side live test once CORS allows 2 origins or D-029 lands; then DHRUMIL-T06 Get help.

### 2026-11-05 · session 3e
- Did: DHRUMIL-T06 Get help + case page (branch 547d055), ChatThread refactor, per-route cases mock; DHRUMIL-010.
- AI tools used: Claude Code (Claude Opus 5.5) for case UI, mock, browser tests.
- Next: merge T06; DHRUMIL-T07 agent console (against the same mock) or DHRUMIL-T08 polish.

### 2026-11-05 · session 3f
- Did: DHRUMIL-T07 agent console (branch 2ae6e6a): sign-in (real), queue, claim, case view with summary/deal/"what each side saw", resolve; DHRUMIL-011.
- AI tools used: Claude Code (Claude Opus 5.5) for console UI, mock, end-to-end browser test.
- Next: merge T07; then DHRUMIL-T08 Golden Path polish once AKSHAT-T06/T07/T08 + deploy land.

### 2026-11-05 · session 4
- Did: pulled AKSHAT-T06…T15; removed all web mocks + openCaseId header (branch fa40e03); full live Golden Path with demo_ accounts on two origins; DHRUMIL-012 REVIEW.
- Learned: /prepare 404s for case groups and takes ~4 s; no system messages; prod DB full of test cases; allowedDevOrigins loop.
- AI tools used: Claude Code (Claude Opus 5.5) for integration, live two-user testing, review.
- Next: merge live-backend branch; DHRUMIL-T09 Meaning Guard sheet (guard.blocking now real); DHRUMIL-T08 polish once deployed.

### 2026-11-05 · session 4b
- Did: DHRUMIL-T09 Meaning Guard sheet (branch fa7545a), verified live: 2 lakh → ₹2,00,000, WhatsApp → scam sheet → Send anyway; DHRUMIL-013.
- AI tools used: Claude Code (Claude Opus 5.5) for guard UI, live tests, root-causing /prepare latency.
- Next: merge T09; DHRUMIL-T10 scam banner + Deal Card.

### 2026-11-05 · session 4c
- Did: DHRUMIL-T10 scam banner + Deal Card (branch 88f43c0): proposed, agreed by both, sealed live; DHRUMIL-014.
- AI tools used: Claude Code (Claude Opus 5.5) for deal UI, live two-user tests.
- Next: merge T10; then DHRUMIL-T11 judge sandbox (demo session API is live) or T15 Seal page.

### 2026-11-06 · session 5
- Found: Akshat force-pushed main (7e5d5b4), which dropped 11 of my commits, and edited apps/web without a REQUEST. Recovered with a normal merge (34d6d87, no force-push). Kept his server work, contracts, the mock-session purge, the 31004 sign-out and the 8 s send budget. Held call/voice out of the UI (D-009, D-027): call-modal.tsx and nexconn/call.ts are in the tree but unused. Sent DHRUMIL-016.
- Lesson: after a pull, run `pnpm --filter @convocart/contracts build`, because the stale dist breaks the server typecheck. After switching branches, `rm -rf apps/web/.next`, because stale route types break the web typecheck.
- AI tools used: Claude Code (Claude Opus 5.5) for conflict resolution and verification.
- Next: T12 landing captures, once D-029 is done and translation is re-tested on Akshat's 7 s fallback chain.

### 2026-11-06 · session 5b
- Did: DHRUMIL-T19 calls + voice notes (5a8b922) on my human's request (D-009/D-027 change proposed in DHRUMIL-017); DHRUMIL-T15 Seal UI (5d2350f); DHRUMIL-018 REQUEST.
- Verified facts (@nexconn/call 26.2.1 index.d.ts): `NCCallEngine.install()` once, BEFORE `NCEngine.initialize()`; `NCCallEngine.initialize({})` is a singleton; handler requires onCallReceived/onCallConnected/onCallEnded; `NCCallUser.userId` is a property (not getUserId()); `startCall({calleeIds:[id], callType: NCCallType.SINGLE, mediaType: NCCallMediaType.AUDIO, extra})` → `{code, callId?, busyLineUserList?}`; code 80006 = VoIP service not enabled for the App Key (our current state).
- Lessons: in dev, Next's error badge (bottom-left) covers the mic button after an SDK console.error, so puppeteer must click through the DOM. Akshat's config loads the root .env with override, which beats launch-env WEB_ORIGIN (3001 blocked by CORS). Server is now on :4000 (.env.local updated). `Date.now()` in useState breaks prerender under Cache Components.
- Test data: 2 voice notes in the demo buyer/seller chat (one shows the "[JA]" fallback).
- AI tools used: Claude Code (Claude Opus 5.5) for Call SDK verification, call/voice/seal UI, puppeteer live tests.

### 2026-11-06 · session 5c
- Did: T19 + T15 merged (smoke green via `pnpm --filter @convocart/server smoke`; the root `pnpm smoke` fails because corepack can't find pnpm 12). DHRUMIL-T16 tone sheet (c2e15c8); DHRUMIL-T17 share + link preview + guest language (baccf9d); DHRUMIL-019.
- Lesson: under Cache Components, `generateMetadata` that awaits `params` needs a `<Suspense>` child that calls `await connection()` (blocking-prerender-metadata), or dev logs an error.
- AI tools used: Claude Code (Claude Opus 5.5) for tone/share UI and puppeteer tests (a Hindi-browser guest).

### 2026-11-07 · session 6
- Did: /start (no new Akshat messages; Last read stays AKSHAT-009). DHRUMIL-T14 write-up draft + screenshots (2692106). DHRUMIL-021 (server tests write to the prod DB: 18 fake open cases in the agent queue), DHRUMIL-022 (humans fill the write-up).
- Lesson: DON'T run `pnpm test` / smoke for apps/server until Akshat isolates the test DB. Nexconn is mocked there, but Postgres is the real one.
- AI tools used: Claude Code (Claude Opus 5.5) for the write-up draft, claim checks against code, puppeteer screenshots.

### 2026-11-07 · session 6b
- Did: Hallmark full redesign (app scope) of every screen in Newsprint on the T12 branch (26f686a): shared primitives (primitives.css) + chrome by me, the screens in 4 parallel subagent groups, lint 0 FAIL/0 WARN, finish review → 8 fixes.
- Lessons: Tailwind 4 + the turbopack loader emptied an inline `@layer components {}` block in globals.css; import a separate file with `@import "./x.css" layer(components)` instead. Dev server started on another branch keeps a stale route list (restart after a checkout). `usePathname` in the chrome needs a client island under <Suspense> with a static fallback. The disk filled up mid-run (ENOSPC); my human freed space.
- AI tools used: Claude Code (Claude Opus 5.5) + 5 subagents (4 screen groups, 1 finish reviewer); Hallmark skill (theme, sloplint).

### 2026-11-07 · session 6c
- Did: Akshat's site/ template theme (dark, Syne + Inter, pills, pale frame) applied to the whole app via tokens + primitives, and a landing page at / with the real product (the same chat in Hindi and Japanese) as the hero (33d1bfd); finish review → fix batch; DHRUMIL-023.
- Lessons: keep the shared token names, so a re-theme is mostly values. Sloplint only reads the first word of `posture:` (restrained|committed|full-palette|drenched). The render tier writes `.hallmark/` next to the files: delete it before `git add -A`. Puppeteer clip uses page coordinates (add scrollY).
- AI tools used: Claude Code (Claude Opus 5.5) + 1 review subagent; Hallmark (scaffold --brand, sloplint --render).
