# Coordination Protocol

Owner: **humans only**. Agents follow it; they never edit it.

## 1. The single-writer rule

Every file in `.coord/` has exactly one writer. Because no file is ever written by both agents, git merges of coordination files can never conflict.

| File | Writer | Readers |
|---|---|---|
| `dhrumil/OUTBOX.md` | Dhrumil | Akshat (and humans) |
| `akshat/OUTBOX.md` | Akshat | Dhrumil (and humans) |
| `dhrumil/MEMORY.md`, `dhrumil/STATUS.md` | Dhrumil | everyone |
| `akshat/MEMORY.md`, `akshat/STATUS.md` | Akshat | everyone |
| `CONTRACTS.md` | Akshat | everyone |
| `DECISIONS.md`, `BACKLOG.md`, `PROTOCOL.md` | humans | everyone |

You **never** edit the other agent's files, not even to mark a message as done. You reply in your own outbox instead.

## 2. Outboxes are append-only

- Only ever add new messages at the **bottom** of your own `OUTBOX.md`.
- Never edit or delete an old message. To correct one, send a new message that references it.

## 3. Message format

```
### DHRUMIL-007 · REQUEST · P1 · 2026-11-05
**To:** Akshat
**Re:** (optional, e.g. AKSHAT-004)
**Task:** DHRUMIL-T05
**Subject:** Need POST /api/messages/prepare to return `guard.issues`

What I need, why, and by when. Be concrete: endpoint, field names, example payload.

**Unblocks:** DHRUMIL-T05 (chat composer)
**Meanwhile:** I'm using a mock that follows the shape below.
```

- **ID:** `DHRUMIL-###` or `AKSHAT-###`, numbered sequentially per agent, never reused. Start at `DHRUMIL-001` / `AKSHAT-001`.
- **Priority:** `P0` = blocking the Golden Path right now · `P1` = needed this phase · `P2` = nice to have.
- **Date:** today's date.

## 4. Message types

| Type | Use it when | Expected reply |
|---|---|---|
| `REQUEST` | You need something from the other agent (endpoint, field, file change, info). | `ACK`, then `DONE` or `WONTFIX` |
| `ACK` | You've read a request and accept it. Include an ETA. | none |
| `DONE` | You've delivered a request. Include branch/commit and how to use it. | none (requester verifies) |
| `WONTFIX` | You can't or shouldn't do it. Give the reason and an alternative. | requester decides or escalates to humans |
| `QUESTION` | You need information, not work. | `ANSWER` |
| `ANSWER` | Reply to a `QUESTION`. | none |
| `CONTRACT-CHANGE` | (Akshat only) You want to change a `STABLE` contract. Include old → new and migration. | Dhrumil must reply `ACK` before Akshat merges |
| `FINDING` | You verified a fact the other agent needs (SDK behavior, gotcha, limit, bug). | none |
| `REVIEW` | Results of `/review` on the other agent's merged work. One message, numbered issues with severity. | `ACK` + fixes, or `WONTFIX` per issue |
| `HEADS-UP` | Something is about to change or break (deploy, migration, env var, renamed route). | none |
| `BLOCKER` | You cannot make progress, even with mocks. Always `P0`. | reply within the other agent's next session |
| `DECISION` | You propose a change to scope, stack or `DECISIONS.md`. Addressed to **Humans**. | humans update `DECISIONS.md` |

## 5. Lifecycle of a request

```
Dhrumil: DHRUMIL-007 REQUEST  →  Akshat: AKSHAT-012 ACK (Re: DHRUMIL-007, ETA Nov 6)  →  Akshat: AKSHAT-015 DONE (Re: DHRUMIL-007, branch akshat/AKSHAT-T04)
                                                              →  Dhrumil verifies, records "DHRUMIL-007 closed" in Dhrumil's MEMORY
```

Each agent tracks open threads in the **Open threads** table of their own `MEMORY.md`.

## 6. Never wait idle

If you're waiting on the other agent:
1. Build against a mock that follows `CONTRACTS.md` exactly.
2. Mark the mock clearly (`// MOCK: remove when AKSHAT-T04 lands`).
3. Note it in your `STATUS.md` under **Mocks in use**.
4. Move to the next unblocked task in `BACKLOG.md`.

Only send a `BLOCKER` if there is genuinely no unblocked work left.

## 7. Contracts

- `CONTRACTS.md` (prose + examples) and `packages/contracts` (TypeScript + zod) must always match. Akshat keeps them in sync.
- Each contract section is marked `DRAFT`, `STABLE`, or `UNVERIFIED`.
  - `DRAFT`: Akshat may change it freely but sends a `HEADS-UP`.
  - `STABLE`: change only via `CONTRACT-CHANGE` + Dhrumil's `ACK`.
  - `UNVERIFIED`: depends on a Nexconn behavior nobody has tested yet. Don't build deeply on it until it's verified.
- Dhrumil requests contract changes with a `REQUEST`. Dhrumil never edits contracts.

## 8. Reviews

- Run `/review` after the other agent merges a meaningful chunk to `main`, and at least once per phase.
- Severity: `S1` breaks the Golden Path or leaks a secret · `S2` wrong behavior or contract mismatch · `S3` UX or code quality.
- Send all findings in **one** `REVIEW` message. You may only report issues; you never fix code you don't own.

## 9. Humans

- Messages addressed **To: Humans** (`DECISION`, escalations) are read by both humans at their daily sync.
- Humans apply accepted decisions to `DECISIONS.md` / `BACKLOG.md` and commit them as `coord(H): …`.
