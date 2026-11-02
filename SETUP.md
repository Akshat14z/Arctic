# Setup guide for the two humans

This kit lets two Claude Code agents build Handshake in parallel without ever stepping on each other. Read this once, together, on day 1.

## What's in the kit

```
CLAUDE.md                 ← master instructions, auto-loaded by Claude Code every session
SETUP.md                  ← this file (for humans)
.claude/commands/
  start.md  → /start      ← start-of-session sync
  msg.md    → /msg        ← send a message to the other agent
  wrap.md   → /wrap       ← end-of-session handoff
  review.md → /review     ← cross-review the other agent's work
.coord/
  PROTOCOL.md             ← messaging rules (humans own)
  PRODUCT_BRIEF.md        ← the why: insight, users, demo story, rubric, submission (humans own)
  ARCHITECTURE.md         ← how web, server, DB, Nexconn and LLM connect (humans own)
  PRIMER.md               ← Nexconn leads to verify + where to find truth (humans own)
  DECISIONS.md            ← stack & scope decisions (humans own)
  BACKLOG.md              ← all tasks, owners, dependencies, dates (humans own)
  CONTRACTS.md            ← Dhrumil↔Akshat interfaces (Agent Akshat owns)
  dhrumil/ ROLE · MEMORY · STATUS · OUTBOX   ← Agent Dhrumil writes only these
  akshat/ ROLE · MEMORY · STATUS · OUTBOX   ← Agent Akshat writes only these
  WHOAMI                  ← local only, gitignored: "dhrumil" or "akshat"
```

## One-time setup (5 minutes)

1. Copy the whole kit into the root of your new repo and push it.
2. Make sure `.gitignore` contains:
   ```
   .coord/WHOAMI
   .env
   .env.*
   !.env.example
   ```
3. Each human, on their own machine, after cloning:
   - Dhrumil: `echo dhrumil > .coord/WHOAMI` → your agent is **Experience** (frontend, chat UI, docs).
   - Akshat: `echo akshat > .coord/WHOAMI` → your agent is **Platform** (backend, SDK server side, AI features, deploy).
4. Both: install the Nexconn skill so your agents use real APIs:
   `npx skills add https://github.com/NexconnAI-Dev/nexconn-skills.git --skill nexconn-chat`
5. Review `.coord/DECISIONS.md` together. The stack is a default; change anything that doesn't match your skills **before** writing code.

## Daily flow

| When | Who | What |
|---|---|---|
| Start of every session | each agent | `/start` → read the report → confirm the plan |
| During work | each agent | `/msg` whenever it needs something from the other side |
| After the other side merges something big | each agent | `/review` |
| End of every session | each agent | `/wrap` (never skip it — it's how the other agent knows what happened) |
| Once a day, 10 min | both humans | Read both STATUS files and any message addressed To: Humans. Update DECISIONS/BACKLOG if needed, commit as `coord(H): …` |

## First session prompts

**Dhrumil (frontend):** `/start` then: "Begin DHRUMIL-T01. Agent Akshat owns root config, so if the monorepo scaffold isn't there yet, send Akshat a REQUEST and scaffold `apps/web` against the expected layout in the meantime."

**Akshat (backend):** `/start` then: "Begin AKSHAT-T01, then AKSHAT-T02. AKSHAT-T02 is the most important task of the week: resolve every UNVERIFIED item in CONTRACTS.md against the real Nexconn SDK."

## Rules for humans

- Only humans edit `CLAUDE.md`, `SETUP.md`, `PROTOCOL.md`, `DECISIONS.md`, `BACKLOG.md`, `PRODUCT_BRIEF.md`, `ARCHITECTURE.md`, `PRIMER.md` and `.claude/commands/`.
- If agents disagree after one round of messages, you two decide, then write it into DECISIONS.
- Don't let agents relay messages through you in chat. Everything goes through the outboxes, so there's always a written record.
- Nov 10 is launch day for real users. Nov 21 is submission day. Nov 22 is buffer only.
