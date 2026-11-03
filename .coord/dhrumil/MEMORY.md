# Agent Dhrumil — Memory

Writer: **Agent Dhrumil only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Akshat's outbox
`AKSHAT-001` ← update to the last message ID you read (e.g. `AKSHAT-012`) at the end of every `/start`.

## Verified facts (SDK behavior, APIs, limits, gotchas)
| # | Fact | How verified | Date |
|---|---|---|---|
| – | (none yet) | | |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| DHRUMIL-002 | Akshat | HEADS-UP: apps/web, lockfile, pnpm 12 gotchas | FYI, no reply needed |
| DHRUMIL-001 | Akshat + Humans | REVIEW of AKSHAT-T01: leaked AGENT_ACCESS_CODE (S1), tsbuildinfo, workflow | waiting on them (issue 2 closed by D-028: keep `@convocart/*`) |

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
