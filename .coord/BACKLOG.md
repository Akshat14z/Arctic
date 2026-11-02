# Backlog

Owner: **humans only**. Agents report progress in their own `STATUS.md`, never here.
Work top to bottom within your column. A task is **Done** only when it meets its Done-when line, is merged to `main`, and the deployed app still passes the Golden Path.

Today's internal deadline: **submit Nov 21**. Real users from **Nov 10**.

**Kill rule (D-020):** if `pnpm smoke` fails on any day in Phase 2 or 3, all new-feature work stops until it is green again. Tasks marked *(next)* ship in table order; drop from the bottom if late.

## Phase 0 — Validate (Nov 2–4)

| ID | Owner | Task | Depends on | Done when |
|---|---|---|---|---|
| H-01 | Humans | Read the full rules + FAQ (prior code, AI disclosure, eligibility, track lock) | – | Notes added to DECISIONS if anything changes |
| H-02 | Humans | Create the production Nexconn app in console.nexconn.ai; put keys in both deploy envs; enable `message:send` webhook later | – | App Key, Secret, area stored in a password manager |
| H-03 | Humans | Translation test: 30 real messages (lakh/crore, Hinglish, slang, prices, dates) through the chosen LLM; count real errors | – | Result recorded; D-013 applied if needed |
| H-04 | Humans | Talk to 5 potential users (campus / local buy-sell groups) | – | Beachhead chosen |
| H-08 | Humans | Register both of you on Reskilll, create the team, team leader selects track **Marketplace & Support** | – | Team visible on the Reskilll dashboard with the right track |
| AKSHAT-T01 | Akshat | Monorepo scaffold, `packages/contracts` with C1–C6 types, Fastify server, `/health`, deployed | H-02 | Dhrumil can import contracts; server live URL works |
| AKSHAT-T02 | Akshat | **SDK spike (server):** register user, issue Nexconn token, verify `extra` field + size limit, server-side group create, server-side message send. Update CONTRACTS "Verified facts" and mark C4/C6 | AKSHAT-T01 | Every `UNVERIFIED` item resolved or flagged as impossible |
| DHRUMIL-T01 | Dhrumil | Next.js app scaffold, layout, design tokens, deployed to Vercel | AKSHAT-T01 (root config) | Live URL renders |
| DHRUMIL-T02 | Dhrumil | **SDK spike (client):** two browsers chat in a `DirectChannel` using tokens from `/api/auth/guest` (mock token endpoint until AKSHAT-T03) | DHRUMIL-T01 | Two real users exchange messages live. Fallback: D-012 |

## Phase 1 — Golden Path MVP (Nov 5–9)

| ID | Owner | Task | Depends on | Done when |
|---|---|---|---|---|
| AKSHAT-T03 | Akshat | Guest auth + sessions + `/api/me` + Nexconn registration | AKSHAT-T02 | C3 auth routes live |
| AKSHAT-T04 | Akshat | Listings API + DB + translated reads | AKSHAT-T03 | C3 listing routes live |
| AKSHAT-T05 | Akshat | `POST /api/chats` (idempotent direct channel) + `GET /api/chats` | AKSHAT-T03 | |
| AKSHAT-T06 | Akshat | `POST /api/messages/prepare` — translation into **every** channel member's language (D-021); guard returns empty issues | AKSHAT-T02 | p95 < 2 s |
| AKSHAT-T07 | Akshat | Cases: create (group), queue, claim (add agent), resolve, system messages, routing v0, frozen `dealSnapshot` (D-018), agent sign-in `POST /api/auth/agent` (D-017) | AKSHAT-T02 | C6 flow works end to end |
| AKSHAT-T08 | Akshat | Webhook receiver + transcript store (with `shownTo`, D-022) + `GET /api/cases/:id` with AI summary | AKSHAT-T07, H-02 | |
| AKSHAT-T09 | Akshat | `pnpm smoke`: scripted Golden Path against the deployed server | AKSHAT-T07 | Runs green in CI or locally in < 2 min |
| DHRUMIL-T03 | Dhrumil | Onboarding: name + language picker → guest session | AKSHAT-T03 (mock ok) | < 10 s from landing to signed in |
| DHRUMIL-T04 | Dhrumil | Listings: browse, search, create, detail | AKSHAT-T04 (mock ok) | |
| DHRUMIL-T05 | Dhrumil | Chat: inbox, conversation view, composer calling `/prepare`, translated rendering + "See original" | AKSHAT-T05, AKSHAT-T06 (mock ok) | Render rule in C4 followed |
| DHRUMIL-T06 | Dhrumil | "Get help" flow + 3-way case chat view for buyer/seller | AKSHAT-T07 (mock ok) | |
| DHRUMIL-T07 | Dhrumil | Agent dispatch console: queue, claim, transcript in agent's language, **"Show me what they saw"** toggle (D-022), summary, resolve | AKSHAT-T07, AKSHAT-T08 (mock ok) | |
| DHRUMIL-T08 | Dhrumil | Golden Path polish pass: loading/empty/error states, reconnection, refresh-safe history, mobile layout | DHRUMIL-T03…DHRUMIL-T07 | Both humans complete the Golden Path on phones |

## 🚀 Nov 10 — Launch to real users (Humans)

| ID | Owner | Task |
|---|---|---|
| H-05 | Humans | Onboard first real users in the chosen beachhead; collect feedback daily into a `DECISION`/`REQUEST` stream via agents |
| H-06 | Humans | Staff the dispatch console (you are the human agents) |

## Phase 2 — Innovation layer (Nov 10–16)

| ID | Owner | Task | Depends on |
|---|---|---|---|
| AKSHAT-T10 | Akshat | Meaning Guard in `/prepare`: number formats (lakh/crore), currency normalization, ambiguity flags | H-03 |
| AKSHAT-T11 | Akshat | Scam shield: detect off-platform payment / gift card patterns (prepare + webhook), post `scam_warning` | AKSHAT-T08 |
| AKSHAT-T12 | Akshat | `POST /api/deals/extract` + deal card message + agree endpoint (add to C3 first) | AKSHAT-T06 |
| DHRUMIL-T09 | Dhrumil | Meaning Guard UI: pre-send confirmation sheet in sender's language | AKSHAT-T10 (mock ok) |
| DHRUMIL-T10 | Dhrumil | Scam warning banner + Deal Card component with agree buttons in both languages | AKSHAT-T11, AKSHAT-T12 (mock ok) |
| AKSHAT-T15 | Akshat | *(next)* Handshake Seal: `sealCode` on agree + public `GET /api/seals/:code` (D-023) | AKSHAT-T12 |
| DHRUMIL-T15 | Dhrumil | *(next)* Seal UI: "Sealed" Deal Card with QR + public `/seal/[code]` page in viewer's language | AKSHAT-T15 (mock ok) |
| AKSHAT-T16 | Akshat | *(next)* Tone Guard: `tone` issues in `/prepare` with softer suggestion (D-024) | AKSHAT-T10 |
| DHRUMIL-T16 | Dhrumil | *(next)* Tone suggestion in the guard sheet ("Send softer version" / "Send as is") | AKSHAT-T16 (mock ok) |
| AKSHAT-T17 | Akshat | *(next)* Public listing read: `GET /api/listings/:id` works without auth (D-025) | AKSHAT-T04 |
| DHRUMIL-T17 | Dhrumil | *(next)* WhatsApp-group launcher: share button (WhatsApp + copy link), public listing page, guest sign-in from the link lands on the listing | AKSHAT-T17 (mock ok) |
| Both | Dhrumil, Akshat | Fix everything real users break. Real-user bugs outrank new features. | – |

## Phase 3 — Polish & judge experience (Nov 17–19)

| ID | Owner | Task |
|---|---|---|
| AKSHAT-T13 | Akshat | Seed script (`demo_` data, a scripted "2 lakh" conversation, an open case) + `POST /api/demo/session` that signs in as a **fixed** `demo_` user, never a new one (D-015) |
| DHRUMIL-T11 | Dhrumil | Judge sandbox: "Try as buyer / seller / agent" in one click, clearly labelled Demo |
| DHRUMIL-T12 | Dhrumil | Landing page explaining the product in 10 seconds |
| AKSHAT-T18 | Akshat | *(if time)* Kept-deal score on `User` (D-026) |
| DHRUMIL-T18 | Dhrumil | *(if time)* "Kept 9 of 9 Handshakes" badge on profiles, chat header and listing |
| AKSHAT-T19 | Akshat | *(stretch, D-027)* Voice notes: speech-to-text → `/prepare` | SDK spike says voice works |
| DHRUMIL-T19 | Dhrumil | *(stretch, D-027)* Record + send voice note; recipient sees translated text + can play original | AKSHAT-T19 |
| Both | Dhrumil, Akshat | `/review` of each other's work; fix all S1/S2 |

## Phase 4 — Submission (Nov 20–21)

| ID | Owner | Task |
|---|---|---|
| DHRUMIL-T13 | Dhrumil | README (judges-in-3-minutes section first, Nexconn features used, prior-work statement), `docs/AI_USAGE.md` |
| DHRUMIL-T14 | Dhrumil | Write-up PDF draft in rubric order: Works (50) → Problem & idea (30) → Traction & business (20). Must include App Key, named Nexconn SDK features, prior-work statement (PRODUCT_BRIEF §8). Akshat sends architecture section via `REQUEST`. |
| AKSHAT-T14 | Akshat | Architecture section + traction numbers export from console/DB (`isDemo = false` only), sent to Dhrumil |
| H-07 | Humans | Record 2–3 min demo video; final checks; **submit Nov 21** |

## Cut list (do not build unless humans move it into a phase)

Call SDK · smart routing beyond v0 · timezone-aware date checks · Google sign-in (see D-014) · offline fallback mode (D-016) · push notifications · image uploads beyond a URL field.
