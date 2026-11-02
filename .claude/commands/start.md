---
description: Start-of-session sync — pull, read coordination files, report inbox and plan
---

Run the Handshake start-of-session ritual. Do every step, in order, and do not write any code until step 8 is done.

1. Run `git pull --rebase`. If it fails, stop and tell the human.
2. Read `.coord/WHOAMI`. If it is missing or not exactly `dhrumil` or `akshat`, STOP and ask the human. That value is "me" (`.coord/<me>/` is your folder); the other name is "other".
3. Read `CLAUDE.md`, `.coord/PROTOCOL.md`, and `.coord/<me>/ROLE.md` if you haven't in this session.
4. Read `.coord/<me>/MEMORY.md` and `.coord/<me>/STATUS.md`.
5. Read `.coord/DECISIONS.md`, `.coord/BACKLOG.md`, `.coord/CONTRACTS.md`, `.coord/PRODUCT_BRIEF.md`, `.coord/ARCHITECTURE.md` and `.coord/PRIMER.md`. Note any contract section whose status changed since your memory says you last looked.
6. Read `.coord/<other>/OUTBOX.md`. Find every message **after** the "Last read" ID in your MEMORY. For each new message addressed to you, classify it: needs reply, needs work, FYI.
7. Read `.coord/<other>/STATUS.md` to see what the other agent is doing and whether they're blocked on you.
8. Report to the human in this format:
   - **New messages:** one line each (ID · type · subject · what I'll do).
   - **The other agent is blocked on me?** yes/no + what.
   - **Contract changes since last session:** list or "none".
   - **My plan for this session:** the replies I'll send first, then the backlog task I'll work on (respect phase order and dependencies; prefer unblocking the other agent).
9. Send any `ACK`/`ANSWER` replies now (append to your own OUTBOX following PROTOCOL format), update "Last read" in your MEMORY, then commit only the `.coord/<me>/` changes as `coord(<me>): sync` and push.
10. Wait for the human to confirm the plan before starting code.
