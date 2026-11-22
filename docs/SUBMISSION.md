# Submission form: ready-to-paste answers

Track: **Marketplace & Support**. Only the team leader submits on Reskilll.

## 01 · Project

**Project name**

```
CommonGrounds
```

**One-paragraph summary** (about 1,100 of 2,000 characters)

```
CommonGrounds is a marketplace chat for buyers and sellers who don't share a language, built for the cross-language trading that happens every day in India's 22-language markets and across borders. Translation apps help people talk; CommonGrounds makes sure they agreed to the same thing, and proves it. Every message arrives in the reader's own language (Hindi, Japanese, English and more), with the original one tap away and a Listen button that reads it aloud. Before a message is sent, Meaning Guard catches the misunderstandings translation creates: "I can pay 2 lakh" becomes ₹2,00,000 so both sides see the same number, curt messages get a softer suggestion, and off-platform payment requests trigger a scam warning. When they agree on a price, a Deal Card shows the same terms on both screens in both languages; once both agree it becomes a CommonGrounds Seal, a QR receipt with a cryptographic signature that any phone can verify, even offline. If something still goes wrong, either side taps Get help: a support agent who speaks neither language sees an AI summary of the claim against the agreed terms, the frozen deal, and exactly what each side saw on screen, then settles it in a three-way chat where everyone reads their own language. It's for students and small sellers trading across languages, and for the marketplaces that support them.
```

## 02 · Proof of Nexconn integration

**Nexconn packages used:** tick **Chat SDK** and **Call SDK**. (We use the Chat SDK directly, not Chat UI.)

**Nexconn App Key**

```
tdrvipkstz5v5
```

**SDK features you used** (where in the app)

```
Chat SDK (web, @nexconn/chat + @nexconn/engine 26.2.1): NCEngine initialize/connect with a per-user token from our server, and connection-status handlers that drive the reconnecting banner. Group channels: one per buyer and listing (the 1:1 buyer-seller chat), plus a separate group channel per support case for the 3-way buyer, seller and agent room. Text messages carrying a structured extra payload (original text, every translation, Meaning Guard results, Deal Cards, voice-note audio), so one message renders in each reader's language. Real-time message handlers for live delivery, and message history (createMessagesQuery) so chats survive a refresh. Server SDK (@nexconn/server-sdk): issueAccessToken for every user; createGroupChannel, joinGroupChannel and batchGetGroupChannelProfiles for chat rooms and the support room (the agent joins on claim); sendGroupChannelMessage for server-sent messages; webhooks with signature verification, anti-replay windows and single-use nonces, recording each message for the agent's "what each side saw" view. Call SDK (@nexconn/call 26.2.1): 1:1 voice calls from the chat header with incoming-call ringing on any page.
```

## 03 · Links

| Field | Value |
|---|---|
| Live app | `https://arctic-swart-six.vercel.app` |
| Public GitHub repository | `https://github.com/Akshat14z/Arctic` |
| Demo video | _your YouTube (Unlisted) or Loom link, after recording `docs/DEMO_SCRIPT.md`_ |

## 04 · Write-up

Upload `docs/CommonGrounds-writeup.pdf` (4 pages: problem, product, Nexconn features by name, what's new, business, built during the challenge, App Key).

## 05 · Traction (optional, but a significant bonus)

**Be exact. Judges check the Nexconn console, and an inflated number costs more than a small one.**

At the time of writing, the production database holds the 3 labelled demo accounts, 8 team test accounts and 1 outside user. Before submitting, open the Nexconn console, note its user count, and report it with that breakdown, for example:

> Active users: _N_ (Nexconn console). Of these, 3 are labelled demo accounts used by the judge sandbox and 8 are our own test accounts; the rest are real people who signed up.

**The fastest honest lever, in the hours left:** every real person who signs in counts. Share the live link with classmates and the college buy-and-sell WhatsApp groups. A ready message:

```
Selling or buying something to/from someone who speaks a different language? Try CommonGrounds, a marketplace chat where every message arrives in your own language, amounts are double-checked ("2 lakh" → ₹2,00,000), and every deal gets a QR receipt anyone can verify. Free, takes 10 seconds: https://arctic-swart-six.vercel.app
```

**Proof link:** a screenshot of the Nexconn console's user count, shared as a public image or Google Drive link, is the strongest proof.

## 06 · Prior work

```
None. Everything in the repository was designed and built during the Nexconn Build Challenge 2026. We used AI coding assistants throughout; see docs/AI_USAGE.md in the repository.
```
