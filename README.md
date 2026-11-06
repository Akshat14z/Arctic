# Handshake

**Same deal, in both languages.**

Handshake is a marketplace chat for buyers and sellers who don't share a language. Translation apps help you talk. Handshake makes sure you agreed to the same thing, and proves it if you didn't.

Built for the **Nexconn Build Challenge 2026**, track **Marketplace & Support**.

---

## For judges, in 3 minutes

**Live app:** _added at deploy_ · **Demo video:** _added at submission_

1. **Sign in as a guest.** Name and language, nothing else. The seeded demo accounts are labelled "Demo": Priya (reads Hindi), Kenji (reads Japanese), Sarah (support agent, reads English). _A one-click "Try as buyer / seller / agent" sandbox ships with the landing page. Until then, the agent console asks for the access code given in our submission form._
2. **Open a listing and tap "Chat with seller".** Write in your language; the other side reads theirs. Tap **See original** under any message to see what was actually typed.
3. **Type "I can pay 2 lakh".** Before it's sent, **Meaning Guard** stops it: "2 lakh" is ambiguous across languages, so it offers **₹2,00,000** instead. Try "Hurry up" (Tone Guard offers a softer version) or "pay me on WhatsApp" (scam warning).
4. **Tap "Propose a deal from this chat".** Both sides see the same **Deal Card**, each in their own language, and agree. Once both agree it becomes a **Handshake Seal** with a QR code. Scan it, or open `/seal/<code>`: anyone can check the agreed terms, no sign-in needed.
5. **Tap "Get help".** A case appears in the agent console (`/agent`). The agent sees the transcript in both languages and a case summary, joins a 3-way chat with buyer and seller, and marks the case resolved.

Also in the chat: **voice notes** (spoken, transcribed, then translated like text) and **1:1 voice calls**. From any listing: **Share on WhatsApp**, with a link preview that opens in the visitor's own language.

## What makes it different

| Stage | Feature | Promise |
|---|---|---|
| Before sending | **Meaning Guard** + **Tone Guard** | What you say is what they read, and how you meant it |
| Agreeing | **Deal Card** → **Handshake Seal** (QR receipt) | What you agreed is written down, and anyone can verify it |
| When it goes wrong | **Three languages, one room** | Disputes are settled on evidence, by an agent who doesn't need to speak either language |
| Growth | **WhatsApp-group launcher** | Paste a link where your buyers already are |

## Nexconn features we use

**Web (Nexconn Web SDK `@nexconn/chat` + `@nexconn/engine` 26.2.1, `apps/web/src/lib/nexconn/`)**
- `NCEngine` connect with a per-user token from our server, plus connection-status handling (reconnecting banner, sign-out on an invalid token).
- **Direct channels** for buyer–seller chat.
- **Group channels** for the 3-way support case (buyer, seller, agent).
- Text messages with a structured **`extra` payload** (our `HandshakeExtraV1`: original text, translations, guard results, deal cards, voice-note audio).
- Live delivery through message handlers, and **message history** after a refresh.
- **Call SDK** (`@nexconn/call` 26.2.1): 1:1 audio calls from the chat header, with incoming-call ringing on any page. Our App Key needs the Call/VoIP service enabled in the Nexconn console.

**Server (Nexconn Server SDK `@nexconn/server-sdk` 0.1.2, `apps/server/src/nexconn/`)**
- **User tokens** issued per signed-in user (User Management API).
- **Group channel creation** for each support case, and **adding the agent** to it (Group Channel Management API).
- **`message:send` webhook** with signature verification and replay protection. It records which language each person was shown, for the agent's transcript.

The Nexconn **App Secret never reaches the browser**: the web app only receives the App Key and a per-user token.

## Architecture

```
apps/web         Next.js 16 (App Router), React 19, Tailwind 4, Nexconn Web SDK
apps/server      Fastify 5, Prisma 6 on Postgres (Supabase), Nexconn Server SDK
packages/contracts  Shared TypeScript types + zod schemas (one source of truth for web and server)
```

- The browser talks to Nexconn directly for real-time chat, and to our server for everything else: sign-in, listings, chats, message preparation, deals, seals, cases.
- **Before a message is sent**, the web app calls `POST /api/messages/prepare`. The server translates the message for the other participants and runs Meaning Guard and Tone Guard. The browser then sends the original plus translations in one Nexconn message. If preparation is slow, the original is sent anyway, so chat never stalls.
- **AI in the product:** translation and voice-note transcription use Google Gemini, called from the server only. Meaning Guard, Tone Guard, scam signals, deal extraction and case summaries are rule-based today.

## Run it locally

Requirements: Node 20+, pnpm 12, a Postgres database, a Nexconn app, and a Gemini API key (optional: without one, messages are sent untranslated).

```bash
pnpm install
```

```bash
cp .env.example .env
```

Fill in `.env`. Variable names only, never commit values: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `AGENT_ACCESS_CODE`, `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`, `NEXCONN_AREA`, `LLM_API_KEY`, `WEB_ORIGIN`. Then set `NEXT_PUBLIC_API_URL` (the server URL) in `apps/web/.env.local`.

```bash
pnpm --filter @convocart/contracts build
```

```bash
pnpm dev:server
```

```bash
pnpm --filter @convocart/web dev
```

The web app runs on http://localhost:3000 and the server on http://localhost:4000.

**Checks**

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm smoke
```

`pnpm smoke` runs the Golden Path end to end against the server: sign-in, listing, chat, message preparation, webhook, deal and seal, case escalation and resolution.

## Honest data

- Seeded demo users and listings have ids starting with `demo_` and are labelled "Demo" in the UI.
- Judges measure traction as active users on our Nexconn app, so we never create throwaway accounts on it. Every number we report excludes `demo_` users and says so.

## Prior work

Everything in this repository was built during the challenge (Oct 23 – Nov 22, 2026). No code existed before it.

## AI tools used to build it

We built Handshake with AI coding assistants and say so openly. See [docs/AI_USAGE.md](docs/AI_USAGE.md).

## Team

- **Dhrumil:** experience. Web app, chat UI, agent console, docs.
- **Akshat:** platform. Server, Nexconn server side, AI features, data, deployment.
