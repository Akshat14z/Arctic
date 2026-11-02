# Nexconn Primer — what we already know

Owner: **humans only** (seeded from research on Nov 2). Agents treat everything here as **leads to verify, not facts**. Once something is verified in code, it goes in CONTRACTS "Verified Nexconn facts" (Akshat) or as a `FINDING` (Dhrumil).

## 1. Where to find truth (in this order)

1. **Installed SDK type definitions** in `node_modules/@nexconn/*` — the most reliable source for exact class and method names.
2. **The `nexconn-chat` skill:** `npx skills add https://github.com/NexconnAI-Dev/nexconn-skills.git --skill nexconn-chat`, then "Use the nexconn-chat Skill to integrate Nexconn Chat into this project."
3. **Official samples on GitHub** (github.com/NexconnAI-Dev): `nexconn-chat-sample-web`, `nexconn-chatui-web`, `nexconn-server-sdk-node`, `nexconn-openapi` (OpenAPI + Postman), `nexconn-call-sample-web`.
4. **docs.nexconn.ai** — ⚠️ blocks automated fetching. If your web tools can't read it, ask your human to open the page and paste the relevant section.
5. **Official hackathon support:** open an issue on **github.com/NexconnAI-Dev/hackathon**. Nexconn replies within 12 hours. Title format `[Web] - [SDK version]: [brief description]`; include integration package (Chat SDK / Chat UI), current behavior, device, logs. ⚠️ **Never post App Keys, user IDs or logs with ids in a public issue** — send those via a Nexconn Console ticket or hackathon@nexconn.ai. Agents draft the issue; a human posts it.

**Never write a Nexconn call from memory or by analogy with another chat SDK.**

## 2. Product facts (from public pages, Nov 2026)

- Nexconn provides Chat SDKs (Web, iOS, Android, Flutter), Chat UI components, a Call SDK, server APIs, webhooks, and server SDKs (Node.js, Python, Go, Java, PHP).
- Channel types: **direct, group, open, community**.
- Free plan ("Chat Growth Credit" / Free Chat Plan): full capabilities free up to 10,000 MAU for one year, no card — far beyond our needs.
- The Flutter SDK depends on RongCloud's IM wrapper, so Nexconn appears to be built on RongCloud's infrastructure. RongCloud concepts may hint at how things work, but **API names differ** — never use RongCloud names in our code.
- Hackathon rule: Chat SDK **or** Chat UI is required (so Chat UI is a legitimate fallback, D-012).
- **Judges count active users on our Nexconn app** (found via the App Key we submit). Every user we register on the production app counts — see D-015.

## 3. Web Chat SDK leads (verify against node_modules)

- Install: `npm install @nexconn/engine@latest @nexconn/chat@latest` (pin exact versions once installed).
- Full TypeScript support.
- Flow: import → initialize → set up listeners → connect → send.
- Names seen in the official quick-start: `NCEngine`, `ConnectionStatusHandler`, `MessageHandler`, `BaseChannel`, `DirectChannel`, `SendTextMessageParams` (e.g. `new SendTextMessageParams({ text: 'Hello, Nexconn!' })`).
- Different channel types use different classes.
- A competitor loaded `@nexconn/chat` version **26.2.1** in the browser successfully.

## 4. Console & server setup leads

- Create an app at **console.nexconn.ai** (Free Chat Plan, no card). **Key Management** shows the **App Key**, **App Secret**, and the **data center** (seen: SG / NA / SA).
- App Secret and token generation stay on the backend. The browser gets only the App Key and a per-user token.
- Webhooks: console → **Chat → Chat settings → Webhooks**, set your URL, select the **`message:send`** event.
- Server API requests are signed; the competitor implemented data-center **backup-host failover**.

## 5. Lessons from the competitor's code (GuardRail Buyer)

- **Webhook security:** Nexconn's webhook signature covers the nonce and timestamp, **not the body**. They added a time window and single-use nonces stored in the database. Do the same, and use an `https://` webhook URL.
- **Structured data in messages:** they used plain text messages with the structured part in the message's `extra`, so messages render sensibly in any client. That is our C4 plan too — verify the field name and size limit.
- **Local dev without a public URL:** webhooks can't reach localhost. Either use a tunnel, or have the client relay events to the server during local development, de-duplicating on the Nexconn message id.
- **Offline fallback:** they switch to a labelled offline mode if Nexconn is unreachable. **We don't build this** (D-016) — it's on the cut list.
