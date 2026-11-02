---
description: End-of-session handoff — status, memory, messages, push
---

Run the Handshake end-of-session ritual:

1. Make sure all code work is committed on your task branch. Never leave uncommitted changes.
2. If anything you did this session affects the other agent (new endpoint, changed behavior, new env var, deploy, discovered SDK fact), send the right message type now: `DONE`, `HEADS-UP`, or `FINDING`. Check that every `REQUEST` you ACKed today either got a `DONE` or still has a valid ETA.
3. **Overwrite** `.coord/<me>/STATUS.md` completely with the current state (task, branch, progress, done, blocked on, mocks in use, next up).
4. Update `.coord/<me>/MEMORY.md`: add verified facts, update open threads, add gotchas, and append a 3–5 line session log entry (did / learned / AI tools used / next).
5. If you are Agent Akshat and a contract changed: confirm `.coord/CONTRACTS.md` and `packages/contracts` match.
6. Commit coordination files separately as `coord(<me>): wrap`, `git pull --rebase`, and push.
7. Give the human a 5-line summary: what's done, what's merged, what's blocked, what the other agent needs to know, and the first thing to do next session.
