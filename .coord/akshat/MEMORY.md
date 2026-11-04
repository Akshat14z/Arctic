# Agent Akshat — Memory

Writer: **Agent Akshat only**. Long-lived knowledge that must survive between sessions. Keep it tidy: update facts in place, but append to the session log.

## Last read of Agent Dhrumil's outbox
`DHRUMIL-003`

## Verified facts (SDK behavior, APIs, limits, gotchas)
| # | Fact | How verified | Date |
|---|---|---|---|
| 1 | Node v22.17.1, npm v10.9.2, pnpm v12.16.1 present in local environment | PowerShell CLI execution | 2026-11-02 |
| 2 | pnpm v12 requires native build approval via `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml` | `pnpm approve-builds --all` | 2026-11-02 |
| 3 | Fastify `setErrorHandler` does not intercept 404s; `setNotFoundHandler` is required for C1 error shape conformance | Integration test in `apps/server/test/health.test.ts` | 2026-11-02 |
| 4 | Official Nexconn Node Server SDK is `@nexconn/server-sdk` v0.1.2 hosted on GitHub (`NexconnAI-Dev/nexconn-server-sdk-node`) | Installed via pnpm and verified in `node_modules/@nexconn/server-sdk` | 2026-11-04 |
| 5 | Token generation endpoint is `userManagementApi.issueAccessToken({ userId, name, avatarUrl })` returning `result.accessToken` | Inspected type definitions in `api.d.ts` | 2026-11-04 |
| 6 | Server-side group creation is supported via `groupChannelManagementApi.createGroupChannel({ channelId, name, owner, userIds })` | Inspected type definitions in `api.d.ts` | 2026-11-04 |
| 7 | Server SDK Configuration requires `setPrimaryBackupDomains(primary, backup)` before sending requests | Inspected `configuration.d.ts` | 2026-11-04 |

## Open threads
| Msg ID | With | Topic | State (waiting on me / waiting on them / closed) |
|---|---|---|---|
| AKSHAT-001 | Dhrumil | Monorepo scaffold and @convocart/contracts published | closed (FYI) |
| DHRUMIL-001 | Dhrumil | AKSHAT-T01 Review issues (S1 access code, S2 name) | closed (AKSHAT-002 sent) |
| DHRUMIL-002 | Dhrumil | Web scaffold HEADS-UP | closed (acknowledged) |
| DHRUMIL-003 | Dhrumil | Client SDK FINDING | closed (facts incorporated) |
| AKSHAT-002 | Dhrumil | AKSHAT-T02 completion & S1 resolution | closed (FYI) |

## Gotchas & lessons
- Windows npm global bin path (`%APPDATA%\npm`) needed to be added to user PATH to resolve `pnpm` directly.
- In Fastify, unmatched routes bypass standard error handlers unless `setNotFoundHandler` is explicitly configured.
- `GroupChannelCreateRequest` in `@nexconn/server-sdk` uses property name `userIds` (array of strings), not `members`.

## Session log (append-only, newest at bottom, 3–5 lines per session)
### 2026-11-02 · session 1
- Did: Established WHOAMI identity (`akshat`), performed start ritual, implemented AKSHAT-T01 (root monorepo config, `packages/contracts` with C1–C6 schemas & tests, `apps/server` with `/health` & error handler & tests).
- Learned: Fastify 404 handling nuance; pnpm 12 build permission configuration.
- AI tools used: Gemini (Antigravity)
- Next: Merge task branch, initiate AKSHAT-T02 (Nexconn server SDK spike & contracts verification) and Prisma DB setup.

### 2026-11-04 · session 2
- Did: Implemented AKSHAT-T02. Fixed S1 security issue in `.env.example`. Installed and configured Prisma 6 with all 9 architectural models; generated client. Installed `@nexconn/server-sdk` v0.1.2 from GitHub and implemented `client.ts`, `tokens.ts`, `channels.ts`. All 16 workspace tests pass.
- Learned: Nexconn server SDK distribution and OpenAPI structure; `issueAccessToken` and `createGroupChannel` exact method signatures.
- AI tools used: Gemini (Antigravity)
- Next: AKSHAT-T03 (Authentication & Sessions routes with Nexconn token issuing and Prisma DB persistence).
