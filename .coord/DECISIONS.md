# Decisions

Owner: **humans only**. Agents propose changes with a `DECISION` message addressed To: Humans.
These defaults were set before the team confirmed them. **Humans: review on day 1 and change anything that doesn't fit your skills.**

| ID | Decision | Status | Why |
|---|---|---|---|
| D-001 | pnpm monorepo: `apps/web`, `apps/server`, `packages/contracts` | Accepted (default) | Shared types, clean ownership split |
| D-002 | Frontend: Next.js (App Router) + TypeScript + Tailwind | Accepted (default) | Fast to build, easy Vercel deploy |
| D-003 | Backend: Node + Fastify + TypeScript, using the Nexconn Node server SDK | Accepted (default) | Official Node server SDK exists |
| D-004 | Database: Postgres (Neon free tier) + Prisma | Accepted (default) | Survives redeploys, free |
| D-005 | LLM calls only from the server; provider + model via env vars | Accepted | Keys never reach the browser |
| D-006 | Deploy: web on Vercel, server on Render or Railway. Deployed from day 1. | Accepted (default) | No end-of-hackathon deploy surprises |
| D-007 | Translation happens **before send** (client → `/api/messages/prepare` → SDK send with extra) | Accepted | Faster and more reliable than post-delivery translation; enables Meaning Guard |
| D-008 | One production Nexconn app for all real users; its App Key is the one we submit | Accepted | Judges see real usage on that app |
| D-009 | Call SDK is cut | Accepted | Optional in rules; risk to the 50% |
| D-010 | Languages v0: en, hi, ta, te, kn, bn, mr, ja | Accepted (default) | India beachhead + one foreign language for the demo |
| D-011 | Agent console uses polling (5 s) in v0 | Accepted | Simplest reliable option |
| D-012 | Pivot rule: if two users can't chat via the Web SDK by the night of Nov 4, switch to Nexconn Chat UI components | Accepted | Rules allow Chat UI |
| D-013 | Pivot rule: if the translation test (H-03) shows few real errors, Meaning Guard is pitched as "clarity" (always show normalized amounts/dates) rather than "error catching" | Accepted | Keeps the innovation claim honest |
| D-014 | Guest login first; Google sign-in only if time allows | Accepted | Fewer moving parts for the Golden Path |
| D-015 | Demo accounts are a **small fixed set** of `demo_` users. The judge sandbox reuses them and never registers a new Nexconn user per click. Every traction number excludes `demo_` users and says so | Accepted (Nov 2) | Judges count active users on our Nexconn app; throwaway accounts would inflate it and break our honesty rule |
| D-016 | No offline fallback mode (cut). Friendly reconnect/error states (DHRUMIL-T08) cover outages | Accepted (Nov 2) | Sandbox + README matter more for judges; fallback mode is a second app to keep working |
| D-017 | Agents sign in with `POST /api/auth/agent {displayName, language, agentLanguages, code}`; `code` must equal server env `AGENT_ACCESS_CODE` | Accepted (Nov 2) | Golden Path step 5 needs real agents; simplest gate that keeps strangers out of the console |
| D-018 | A case stores a **frozen snapshot** of the latest agreed Deal at the moment it opens (`Case.dealSnapshot`) | Accepted (Nov 2) | Disputes are resolved on what was agreed, not on a deal edited later |
| D-019 | Coordination docs live only in `.coord/` (no root copies). `PRODUCT_BRIEF.md`, `PRIMER.md`, `ARCHITECTURE.md` added there, humans-owned | Accepted (Nov 2) | One copy can't drift |
