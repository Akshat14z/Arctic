# How we used AI to build Handshake

We built Handshake with AI coding assistants, and we want judges to know exactly how. Every session is logged in `.coord/dhrumil/MEMORY.md` and `.coord/akshat/MEMORY.md`. This page summarises them.

## The tools

| Who | Tool | Model | Used for |
|---|---|---|---|
| Dhrumil (experience) | Claude Code | Claude Opus 5.5 | Web app, chat UI, agent console, docs, browser tests |
| Akshat (platform) | Antigravity | Gemini | Server, Nexconn server side, database, AI features, tests |

## How we worked

Two people, each driving one AI agent on their own machine. The agents never talked to each other directly. They coordinated only through files in the repo (`.coord/`), synced with git:

- **Hard file ownership.** The web agent edits only `apps/web` and docs; the platform agent edits only `apps/server`, `packages/contracts` and config. A change in someone else's file is a written request, not an edit.
- **Contracts first.** Shared types and API shapes live in `packages/contracts` and `.coord/CONTRACTS.md`. The web side builds against mocks that follow the contract, then swaps in the live server.
- **Humans decide.** Scope, stack and product decisions are in `.coord/DECISIONS.md`, and only the humans edit it. When an agent wanted something new, it wrote a proposal; a human approved or rejected it.
- **Every Nexconn call was checked, not guessed.** Agents read the installed SDK type definitions (`node_modules/@nexconn/*`) and the official docs before using an API. For example, the Call SDK's rule that `NCCallEngine.install()` must run before `NCEngine.initialize()` came from its type definitions.
- **Verified live.** Features were tested in a real browser against the production Nexconn app, with two users at once, using only the fixed `demo_` accounts.

## What the AI did, by area

**Web app (Claude Code)**
- Planning: reviewed the plan against the challenge rules, researched existing products, drafted the product brief and architecture with the humans.
- Built: the Nexconn Web SDK wrapper, guest onboarding, listings, 1:1 chat with translation and "See original", Get help and the case page, the agent console, the Meaning Guard and Tone Guard sheets, the scam banner, the Deal Card and Handshake Seal (QR + public page), voice notes, 1:1 calls, and the WhatsApp share launcher.
- Testing: drove two browsers at once (buyer and seller) to check translation, guard, deals, seals, cases and voice notes end to end. Also ran unit tests for the message render rule and the amount parser.
- Reviews: read the platform agent's merged work and reported bugs, such as translation timeouts and a channel-scoping issue that led to decision D-029.

**Server (Antigravity)**
- Built: the monorepo setup and shared contracts, the Prisma data model, Nexconn token issuing, listings and chats, message preparation (translation + Meaning Guard + Tone Guard), deals and seals, cases and escalation into Nexconn group channels, the Nexconn webhook with signature checks, the demo sandbox accounts, and voice transcription.
- Testing: the Vitest suite in `apps/server/test`, including the end-to-end Golden Path smoke test (`pnpm smoke`).

## AI inside the product

Separate from building it, the running product uses AI in two places, both called from our server only (keys never reach the browser):

- **Translation** of every message, through Google Gemini, with a fallback chain of models and a time budget. If translation is slow, the original is sent and readers can still read it.
- **Voice-note transcription**, through Gemini. The transcript is then translated like typed text.

Meaning Guard, Tone Guard, scam signals, deal extraction and case summaries are rule-based today, not AI.

## What humans did

The humans chose the idea, the positioning ("Same deal, in both languages") and the feature set, and made every scope decision. They set up the Nexconn app and added the API keys themselves, and they approved each test account created on the production app. They also decided when each feature was merged.
