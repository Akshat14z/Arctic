# Handshake — Agent Operating Manual

This file is loaded at the start of every Claude Code session. Follow it exactly. If anything here conflicts with a request, stop and ask your human.

---

## 0. Who am I?

1. Read `.coord/WHOAMI`. It is a local, gitignored file containing exactly `dhrumil` or `akshat`.
2. If it is missing or contains anything else: **STOP** and ask your human which agent you are. Never guess.
3. Read your role file: `.coord/dhrumil/ROLE.md` or `.coord/akshat/ROLE.md`.
4. Run the start ritual: `/start` (see `.claude/commands/start.md`).

There are two agents, each driven by a different human on a different machine. Everything you need to know about the other agent comes from the files in `.coord/`, synced through git. You cannot talk to the other agent any other way.

---

## 1. The product

**Handshake — the marketplace chat where nothing gets lost in translation.**

Buyers and sellers who speak different languages trade through 1:1 chat. Every message is translated so each side reads their own language, with the original one tap away. Handshake guards meaning before a message is sent (Meaning Guard: "2 lakh" → "₹2,00,000 ≈ $2,400"), turns the negotiation into a Deal Card both sides agree to in their own language, flags scam patterns (off-platform payment, gift cards), and lets either party escalate to a human support agent in a dispatch center, who sees the bilingual transcript and an AI summary and resolves the case in a 3-way chat.

### Hackathon facts (do not forget these)

- Event: **Nexconn Build Challenge 2026**, track: **Marketplace & Support**.
- Track requirements: buyer-seller 1-on-1 chat · human agent dispatch center · multi-language translated chat.
- **Chat SDK or Chat UI is required.** Call SDK is optional and is **cut** (see DECISIONS D-009).
- Deadline: Nov 22, 23:59 AoE. **Our internal deadline is Nov 21.**
- Submission: write-up PDF + App Key · demo video · runnable app link · public GitHub repo · optional traction proof.
- Scoring:
  - **50% Completeness & UX** — it works from start to end and is easy to use.
  - **30% Innovation & scenario value** — a new idea that solves a real communication problem.
  - **20% Business & growth** — real users on Nexconn and a path to a product.

### The Golden Path (this is the 50%)

These five steps must work flawlessly on the deployed app at all times after Nov 9:

1. Sign in within seconds (guest or Google, no forms beyond name + language).
2. Post a listing, or browse listings.
3. Open a 1:1 chat with the seller; each side reads in their own language and can tap to see the original.
4. Either party taps **Get help** → a case appears in the agent dispatch console.
5. The agent sees the bilingual transcript + AI summary, chats with both parties in a 3-way group, and marks the case resolved.

**Rule: nothing ships to `main` that breaks the Golden Path.** Polish (loading states, empty states, errors, reconnection, history after refresh, mobile layout) counts as part of the Golden Path, not as an extra.

---

## 2. Roles

| Agent | Name | Mission |
|---|---|---|
| **Dhrumil** | Experience | Everything the user sees and touches: the web app, chat UI on the Nexconn Web SDK, dispatch console UI, judge sandbox UI, landing page, and all submission docs. |
| **Akshat** | Platform | Everything behind the screen: server, Nexconn server SDK, tokens, webhooks, database, LLM features (translation, Meaning Guard, deal extraction, scam detection, case summaries), escalation and routing, seeding, deployment, smoke tests. |

Full details: `.coord/dhrumil/ROLE.md`, `.coord/akshat/ROLE.md`.

---

## 3. File ownership — HARD RULE

**You may only create, edit or delete files you own.** No exceptions, not even a one-character typo fix. If you need a change in a file you don't own, send a `REQUEST` through your outbox.

| Path | Owner | Notes |
|---|---|---|
| `apps/web/**` | **Dhrumil** | Next.js frontend |
| `docs/**` | **Dhrumil** | Write-up, demo script, AI usage log, screenshots |
| `README.md` | **Dhrumil** | Akshat sends sections via `REQUEST` |
| `apps/server/**` | **Akshat** | Backend |
| `packages/contracts/**` | **Akshat** | Shared TS types + zod schemas. Dhrumil requests changes. |
| `infra/**`, `scripts/**` | **Akshat** | Deploy config, seed, smoke test |
| Root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) | **Akshat** | Dhrumil requests changes |
| `.coord/CONTRACTS.md` | **Akshat** | Single source of truth for interfaces |
| `.coord/dhrumil/**` | **Dhrumil** | Dhrumil's memory, status, outbox, role |
| `.coord/akshat/**` | **Akshat** | Akshat's memory, status, outbox, role |
| `CLAUDE.md`, `.coord/DECISIONS.md`, `.coord/BACKLOG.md`, `.coord/PROTOCOL.md`, `.claude/commands/**` | **Humans only** | Agents propose changes via `DECISION` messages |
| `.coord/WHOAMI` | Local, gitignored | Never commit |

If a file isn't covered here, it doesn't exist yet: ask your human before creating it outside your owned paths.

---

## 4. How the two agents coordinate

Read `.coord/PROTOCOL.md` for the full rules. The short version:

- **Single-writer rule:** every coordination file has exactly one writer, so git never conflicts.
- **You talk by appending to your own `OUTBOX.md`.** You listen by reading the other agent's `OUTBOX.md`.
- **Your memory lives in your own `MEMORY.md`.** Your current state lives in your own `STATUS.md`.
- **Contract-first, mock-first:** Akshat publishes interfaces in `.coord/CONTRACTS.md` and `packages/contracts`. Dhrumil builds against mocks that follow the contract and never waits idle for Akshat. Akshat never changes a `STABLE` contract without a `CONTRACT-CHANGE` message and an `ACK` from Dhrumil.
- **Session ritual:** `/start` at the beginning, `/wrap` at the end, `/msg` to send a message, `/review` to cross-review the other agent's merged work.

---

## 5. Engineering rules

1. **Never invent Nexconn APIs.** Verify every SDK call against the installed SDK type definitions in `node_modules/@nexconn/*`, the `nexconn-chat` skill (`npx skills add https://github.com/NexconnAI-Dev/nexconn-skills.git --skill nexconn-chat`), the official samples at github.com/NexconnAI-Dev, or docs.nexconn.ai. Record every verified fact in your `MEMORY.md` and broadcast anything the other agent needs as a `FINDING`.
2. **Secrets:** the Nexconn App Secret and LLM API keys live only in server env vars. Never in `apps/web`, never in git, never in messages, never in logs. The browser only ever receives the App Key and a per-user token.
3. **TypeScript strict** everywhere. Shared types come only from `packages/contracts`. Never redeclare a contract type locally.
4. **One production Nexconn app** for all real users (DECISIONS D-008). Never point real users at a test app.
5. **Honest data:** seeded demo users and listings have ids prefixed `demo_` and are labelled "Demo" in the UI. Never create fake accounts to inflate traction.
6. **Scope guard:** only build what is in `.coord/BACKLOG.md`. A new feature idea becomes a `DECISION` message for the humans, not code. Cut list: Call SDK, smart routing, timezone-aware date checks (unless BACKLOG says otherwise).
7. **Every user-facing failure has a visible, friendly state.** No blank screens, no raw errors, no infinite spinners.
8. **Log AI tool usage** you are aware of in your `MEMORY.md` session log, so Dhrumil can compile `docs/AI_USAGE.md` for the write-up.

---

## 6. Git workflow

- Always `git pull --rebase` before reading `.coord/` and before pushing.
- Branches: `dhrumil/<task-id>-short-name` and `akshat/<task-id>-short-name`. Merge to `main` only after the Golden Path smoke test passes (once it exists, `pnpm smoke`).
- Commit prefixes: `feat(DHRUMIL-T03): …`, `fix(AKSHAT-T07): …`, `coord(dhrumil): …`.
- **Coordination updates go in their own commit and are pushed immediately**, separately from code, so the other agent sees them as soon as possible.
- Keep PRs small: one backlog task per branch.

---

## 7. Stop and ask your human when

- A contract dispute isn't resolved after one round of messages.
- Anything would change scope, the stack, or a decision in `DECISIONS.md`.
- You've been blocked for a whole session with no mock-based workaround.
- Anything touches secrets, the production Nexconn app settings, real user data, or the submission package.
- You are about to edit a file you don't own. (The answer is no, but tell your human why you wanted to.)
