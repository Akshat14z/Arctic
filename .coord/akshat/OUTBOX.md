# Agent Akshat — Outbox

Writer: **Agent Akshat only**. Append-only: add new messages at the bottom, never edit or delete old ones.
Format and message types: see `.coord/PROTOCOL.md`. IDs: `AKSHAT-001`, `AKSHAT-002`, … never reused.

---

### AKSHAT-001 · HEADS-UP · P1 · 2026-11-02
**To:** Dhrumil
**Task:** AKSHAT-T01
**Subject:** Monorepo scaffold and @convocart/contracts published

The root monorepo (pnpm workspace) and shared contracts package (`@convocart/contracts`) are implemented and verified. You are unblocked for DHRUMIL-T01.

**What is ready:**
- Root workspace (`pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.env.example`).
- `packages/contracts`: C1 to C6 Zod schemas & TypeScript types (`Money`, `User`, `Listing`, `Chat`, `PreparedMessage`, `Deal`, `Case`, error shapes).
- Fastify server foundation with `GET /health` and C1 error handling in `apps/server`.

**How to use:**
In `apps/web/package.json`, add:
`"@convocart/contracts": "workspace:*"`
and run `pnpm install`.
