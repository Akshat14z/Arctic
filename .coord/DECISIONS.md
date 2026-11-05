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
| D-012 | Pivot rule: if two users can't chat via the Web SDK by the night of **Nov 6** (was Nov 4), switch to Nexconn Chat UI components | Accepted · amended Nov 4 | Rules allow Chat UI. Extended because H-02 (Nexconn app + tokens) wasn't done; the SDK module and `/spike` are ready and already reach Nexconn (DHRUMIL-003). Nov 7–9 stays free for the pivot if needed |
| D-013 | Pivot rule: if the translation test (H-03) shows few real errors, Meaning Guard is pitched as "clarity" (always show normalized amounts/dates) rather than "error catching" | Accepted | Keeps the innovation claim honest |
| D-014 | Guest login first; Google sign-in only if time allows | Accepted | Fewer moving parts for the Golden Path |
| D-015 | Demo accounts are a **small fixed set** of `demo_` users. The judge sandbox reuses them and never registers a new Nexconn user per click. Every traction number excludes `demo_` users and says so | Accepted (Nov 2) | Judges count active users on our Nexconn app; throwaway accounts would inflate it and break our honesty rule |
| D-016 | No offline fallback mode (cut). Friendly reconnect/error states (DHRUMIL-T08) cover outages | Accepted (Nov 2) | Sandbox + README matter more for judges; fallback mode is a second app to keep working |
| D-017 | Agents sign in with `POST /api/auth/agent {displayName, language, agentLanguages, code}`; `code` must equal server env `AGENT_ACCESS_CODE` | Accepted (Nov 2) | Golden Path step 5 needs real agents; simplest gate that keeps strangers out of the console |
| D-018 | A case stores a **frozen snapshot** of the latest agreed Deal at the moment it opens (`Case.dealSnapshot`) | Accepted (Nov 2) | Disputes are resolved on what was agreed, not on a deal edited later |
| D-020 | USP is **"Same deal, in both languages."** New features in tiers. **Must ship:** three-language rooms, "Show me what they saw". **Build next, in this order:** Handshake Seal, Tone Guard, WhatsApp-group launcher. **If time:** kept-deal score. **Stretch:** voice notes. **Kill rule:** if `pnpm smoke` fails on any Phase 2–3 day, all new-feature work stops until it's green | Accepted (Nov 2) | Strong innovation story without risking the 50% Golden Path |
| D-021 | Three languages, one room: `/prepare` translates into **every** member's language; an agent never needs to speak the parties' languages | Accepted (Nov 2) | Already in the design; costs one more translation per message in cases |
| D-022 | "Show me what they saw": each transcript line records, per member, the language and exact text that member's client rendered (`shownTo`) | Accepted (Nov 2) | Disputes settled on what each side actually read |
| D-023 | Handshake Seal = random unguessable `sealCode` stored with an agreed deal; public page `/seal/<code>` shows the verified deal + QR. No cryptography | Accepted (Nov 2) | Lookup on our server is the verification; least to build |
| D-024 | Tone Guard = new `GuardIssue.kind = "tone"` from `/prepare`, never blocking, with a softer suggestion | Accepted (Nov 2) | One more prompt in an existing call |
| D-025 | WhatsApp-group launcher: public listing page + share button; opening it signs the visitor in as guest and lands them in the listing, one tap from chat | Accepted (Nov 2) | Meets users where they already trade; the traction lever |
| D-026 | Kept-deal score v0: `kept / total`, where total = deals the user agreed to and kept = those with no case opened against them. Shown only when total ≥ 1 | Accepted (Nov 2) | Simple, honest, computable from existing tables |
| D-027 | Voice notes are stretch only: attempted only if the SDK spike shows voice messages work and Phase 2 is done; otherwise cut on Nov 16 | Accepted (Nov 2) | Unverified SDK + speech-to-text risk |
| D-029 | **One Nexconn group channel per buyer+listing chat.** `POST /api/chats` creates it server-side (`createGroupChannel`, members buyer + seller) the first time, so `channelId` is the real Nexconn id; `channelType` becomes `"group"`. A case later reuses the same pattern (agent added to a group) | Accepted (Nov 5) | A `DirectChannel` is keyed by the user pair only, so two listings with the same seller would share one conversation, history and unread count (DHRUMIL-004) |
| D-028 | Code packages keep the `convocart` scope (`@convocart/contracts`, `@convocart/server`, …). The **product** name shown to users, judges and docs stays **Handshake** | Accepted (Nov 2) | Avoids renaming imports already written; package names are internal |
| D-019 | Coordination docs live only in `.coord/` (no root copies). `PRODUCT_BRIEF.md`, `PRIMER.md`, `ARCHITECTURE.md` added there, humans-owned | Accepted (Nov 2) | One copy can't drift |
