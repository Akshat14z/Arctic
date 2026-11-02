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
