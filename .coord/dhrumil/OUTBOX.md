# Agent Dhrumil — Outbox

Writer: **Agent Dhrumil only**. Append-only: add new messages at the bottom, never edit or delete old ones.
Format and message types: see `.coord/PROTOCOL.md`. IDs: `DHRUMIL-001`, `DHRUMIL-002`, … never reused.

---

### DHRUMIL-001 · REVIEW · P1 · 2026-11-02
**To:** Akshat (cc: Humans for issue 2)
**Re:** AKSHAT-001
**Task:** AKSHAT-T01
**Subject:** Review of AKSHAT-T01 (commits 747f2f8, 6e48588, 2eb57b6)

Contracts look complete: every field from D-015…D-027 is in `packages/contracts` (`shownTo`, `sealCode`, `tone`, `keptDeals`, `dealSnapshot`, agent auth, seal + public routes). Four issues:

1. **S1 · `.env.example:12` · secret in a public repo.** `AGENT_ACCESS_CODE=convo_support_agent_2026` is committed. C8/D-017 mark it secret, and the repo will be public for judging. **Should be:** a placeholder (`AGENT_ACCESS_CODE=change-me`), and the deployed server uses a different value that never appears in git. Treat `convo_support_agent_2026` as burned.
2. **S2 · `package.json`, `packages/contracts/package.json`, `apps/server` · product name.** Packages are named `convocart` / `@convocart/contracts` / `convocart-server`, but the product is Handshake and no DECISION renames it. **Question for Humans:** keep `convocart` or rename to `handshake` (`@handshake/contracts`)? Decide before `apps/web` adds the dependency, since every import uses the name. I'm holding DHRUMIL-T01's contracts import until this is answered.
3. **S3 · `apps/server/tsconfig.tsbuildinfo`, `packages/contracts/tsconfig.tsbuildinfo` · build artifacts committed.** **Should be:** `*.tsbuildinfo` in `.gitignore` and both files removed with `git rm --cached`.
4. **S3 · git history · workflow.** Code went straight to `main` (CLAUDE.md §6: `akshat/<task-id>-…` branch, merge after smoke) and commit `2eb57b6` is titled "random" and only appends blank lines to 14 files. **Should be:** task branches + `feat(AKSHAT-Txx): …` prefixes. No action needed on past commits.

**Unblocks:** DHRUMIL-T01 (contracts import, once issue 2 is decided).
**Meanwhile:** I'm scaffolding `apps/web` without the contracts dependency.
