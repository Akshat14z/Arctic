# CommonGrounds

**Same deal, in both languages.**

CommonGrounds is a marketplace chat for buyers and sellers who don't share a language. Every message arrives in the reader's own language, every amount is checked before it is sent, and every agreement becomes a signed receipt that anyone can verify. When something still goes wrong, a support agent who reads both sides settles it on evidence.

Translation apps help you talk. CommonGrounds makes sure you agreed to the same thing, and proves it if you didn't.

Built for the **Nexconn Build Challenge 2026**, track **Marketplace & Support**.

**Live app:** https://arctic-swart-six.vercel.app · **Demo video:** _link in the submission form_ · **Nexconn App Key:** `tdrvipkstz5v5`

---

## For judges, in 3 minutes

No sign-up needed. Everything below runs on the live app with labelled demo accounts.

1. **Watch both sides at once.** Open [`/try`](https://arctic-swart-six.vercel.app/try) and tap **Watch both sides at once**. Priya (reads Hindi) and Kenji (reads Japanese) appear side by side in one window, each signed in separately. Type as Priya; Kenji reads it in Japanese, live. Tap **See original** under any message to see what was actually typed, or **Listen** to hear it in your language.
2. **Try to say an amount loosely.** Type "I can pay 2 lakh". **Meaning Guard** stops it before it is sent: "2 lakh" can be misread across languages, so it offers **₹2,00,000** instead. "Pay me on WhatsApp" triggers a scam warning; a curt "Hurry up" gets a softer suggestion.
3. **See a sealed deal.** The demo chat already holds the **Deal Card** both sides agreed to, each in their own language, sealed as a **CommonGrounds Seal**: a QR code whose link carries a cryptographic signature. Scan it with a phone: the page checks the signature **on that phone**, shows "Signed by CommonGrounds", and flags any changed price in red, even if our server is down. To make a deal of your own, sign in as Priya, open any of Kenji's listings, tap **Chat with the seller**, then **Make an offer**; agree to it as Kenji from `/try`.
4. **Ask for help.** Tap **Get help**. The buyer sees what happens next and the deal they agreed to. Back on `/try`, open **Sarah, the agent**: the dispatch console shows the case, the AI summary (the claim set against the agreed terms), the frozen Deal Card and **What each side saw**, the exact text each person had on screen in each language. Claim the case and the three of them talk in one room, each in their own language.
5. **Sell something.** The **Selling** tab is a seller dashboard: your listings, buyers talking to you, inline edits. Listings are written once and read in every buyer's language.

## Why it matters

India alone trades across 22 scheduled languages. A Tamil-speaking seller and a Hindi-speaking buyer face the same problem as a seller in Osaka and a buyer in Pune: machine translation gets the words across but not always the deal. "2 lakh" becomes "200,000" or "2 lakh" or "200"; "almost new" becomes "new". Each side then believes they agreed to something different, and a support agent has to work out who said what, in which language.

CommonGrounds makes the chat itself the trust layer:

| Moment | Feature | Promise |
|---|---|---|
| Before sending | **Meaning Guard** and **Tone Guard** | What you say is what they read, and how you meant it |
| Reading | **Translated chat**, **See original**, **Listen** | Everyone reads and hears their own language, the original one tap away |
| Agreeing | **Deal Card**, then the **CommonGrounds Seal** | The same terms on both screens, signed, verifiable by anyone |
| When it goes wrong | **Get help**, **What each side saw**, AI case summary | An agent who speaks neither language still settles it on evidence |
| Growing | **Seller dashboard**, storefronts, follow and watchlist, WhatsApp share | Sellers bring buyers from where they already trade |

The interface itself follows the reader: chat, deals, help, navigation, Browse, listings, Home and Selling are in Hindi and Japanese as well as English.

## Nexconn integration

**Chat SDK (web, `@nexconn/chat` + `@nexconn/engine` 26.2.1, `apps/web/src/lib/nexconn/`)**
- `NCEngine.initialize` / `connect` with a per-user token issued by our server; connection-status handlers drive the "reconnecting" banner.
- **Group channels** for every buyer and listing pair, and a separate group channel for each support case (buyer, seller, agent).
- **Text messages with a structured `extra` payload** (original text, every translation, Meaning Guard results, Deal Cards, voice-note audio): one message, many readers, each sees their own language.
- **Live delivery** through message handlers and **message history** (`createMessagesQuery`) after a refresh.

**Call SDK (optional, `@nexconn/call` 26.2.1):** 1:1 voice calls from the chat header with incoming-call ringing on any page. It needs the Call/VoIP service enabled for the App Key in the Nexconn console.

**Server SDK (`@nexconn/server-sdk`, `apps/server/src/nexconn/`)**
- `issueAccessToken` for every user (guest, account, demo, agent).
- `createGroupChannel`, `joinGroupChannel`, `batchGetGroupChannelProfiles`: chat rooms per listing, the support room, the agent joining on claim.
- `sendGroupChannelMessage`: server-sent messages (the scripted demo conversation).
- **Webhooks** (`POST /api/webhooks/nexconn`) with signature verification, anti-replay time windows and single-use nonces, recording each message for the agent's transcript.

## Architecture

```
apps/web        Next.js 16 (App Router), React 19, Tailwind 4. Chat UI on the Nexconn Web SDK.
apps/server     Fastify, Prisma, Postgres (Supabase, Singapore). Nexconn Server SDK, Gemini for translation,
                Meaning Guard, deal extraction and case summaries.
packages/contracts  Zod schemas shared by web and server: one source of truth for every API shape.
```

- The browser only ever receives the App Key and a per-user token. The App Secret and LLM keys stay on the server.
- Seals are signed with Ed25519 on the server; the public key ships with the web app, so a phone verifies a Seal without contacting us.
- Demo accounts and demo listings are read-only on the server, so one visitor can't break the demo for the next.

## Run it locally

```bash
corepack enable && pnpm install
cp .env.example .env            # Nexconn keys, DATABASE_URL, LLM_API_KEY, SEAL_SIGNING_SEED
pnpm --filter @convocart/contracts build
pnpm --filter @convocart/server dev     # API on :4000
pnpm --filter @convocart/web dev        # web on :3000
```

Tests: `pnpm --filter @convocart/server test` (runs against an isolated `test` schema, never production data) and `node --test apps/web/src/lib/*.test.mts`. Deploying: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Prior work

None. Everything in this repository was designed and built during the Nexconn Build Challenge 2026. We used AI coding assistants throughout; see [`docs/AI_USAGE.md`](docs/AI_USAGE.md).

## Honest data

Demo accounts and listings carry `demo_` ids and are labelled **Demo** everywhere. We never create accounts to inflate numbers. Demo photos are from Unsplash (free licence, credited in [`apps/web/public/demo/CREDITS.md`](apps/web/public/demo/CREDITS.md)); people drawn from Open Peeps by Pablo Stanley (CC0).

## Team

Dhrumil (experience: web app, chat UI, dispatch console, design) and Akshat (platform: server, Nexconn server SDK, AI features, deployment).
