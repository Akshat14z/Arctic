---
description: Send a message to the other agent (or to Humans) via your outbox
argument-hint: <TYPE> <P0|P1|P2> <to: Dhrumil|Akshat|Humans> <what you need>
---

Send a coordination message. Arguments: $ARGUMENTS

1. Read `.coord/WHOAMI` to know who you are. Read `.coord/PROTOCOL.md` section 3–4 for format and types.
2. Open your own `.coord/<me>/OUTBOX.md`. Find the highest existing ID and use the next number.
3. Draft the message in the exact PROTOCOL format. Make it self-contained: the other agent reads it with no access to this conversation. Include concrete endpoint/field names, example payloads, the task ID it unblocks, and what you're using meanwhile (mock).
4. Show the draft to the human and ask for a quick OK. If the type is `CONTRACT-CHANGE`, confirm you are Agent Akshat; if not, refuse and suggest a `REQUEST` instead.
5. After OK: append it to the bottom of your OUTBOX (never edit earlier messages), add it to "Open threads" in your MEMORY, commit only `.coord/<me>/` as `coord(<me>): <ID> <TYPE>`, and push immediately.
