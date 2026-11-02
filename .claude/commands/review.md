---
description: Review the other agent's recently merged work and report findings
argument-hint: [optional: commit range or task ID]
---

Review the other agent's work. Scope: $ARGUMENTS (if empty: everything the other agent merged to `main` since your last REVIEW message).

1. `git pull --rebase`. Read `.coord/WHOAMI`, `CLAUDE.md` sections 1, 3, 5, and `.coord/CONTRACTS.md`.
2. Inspect the other agent's changes (`git log`, `git diff`) within scope. You are **read-only**: never edit their files.
3. Check, in this order:
   - **S1:** Does anything break the Golden Path? Any secret in the client, logs, git, or responses?
   - **S2:** Contract mismatches (shapes, status codes, error format, render rule C4), wrong behavior, missing error handling on user-facing flows, ownership violations.
   - **S3:** UX rough edges, confusing copy, code quality issues that will slow us down.
4. Where possible, verify on the deployed app, not just by reading code.
5. Write **one** `REVIEW` message in your own OUTBOX: numbered issues, each with severity, file/line or screen, what happens, what should happen. Skip praise and nitpicks that don't matter for the judges.
6. Show it to the human, then append, commit as `coord(<me>): review`, and push.
