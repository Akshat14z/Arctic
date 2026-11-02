# Agent Akshat — Memory

Writer: **Agent Akshat only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Dhrumil's outbox
`none`

## Verified facts (SDK behavior, APIs, limits, gotchas)
| # | Fact | How verified | Date |
|---|---|---|---|
| 1 | Node v22.17.1, npm v10.9.2, pnpm v12.16.1 present in local environment | PowerShell CLI execution | 2026-11-02 |
| 2 | pnpm v12 requires native build approval via `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml` | `pnpm approve-builds --all` | 2026-11-02 |
| 3 | Fastify `setErrorHandler` does not intercept 404s; `setNotFoundHandler` is required for C1 error shape conformance | Integration test in `apps/server/test/health.test.ts` | 2026-11-02 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| AKSHAT-001 | Dhrumil | Monorepo scaffold and @convocart/contracts published | closed (FYI) |

## Gotchas & lessons
- Windows npm global bin path (`%APPDATA%\npm`) needed to be added to user PATH to resolve `pnpm` directly.
- In Fastify, unmatched routes bypass standard error handlers unless `setNotFoundHandler` is explicitly configured.

## Session log (append-only, newest at bottom, 3–5 lines per session)
### 2026-11-02 · session 1
- Did: Established WHOAMI identity (`akshat`), performed start ritual, implemented AKSHAT-T01 (root monorepo config, `packages/contracts` with C1–C6 schemas & tests, `apps/server` with `/health` & error handler & tests).
- Learned: Fastify 404 handling nuance; pnpm 12 build permission configuration.
- AI tools used: Gemini (Antigravity)
- Next: Merge task branch, initiate AKSHAT-T02 (Nexconn server SDK spike & contracts verification) and Prisma DB setup.
