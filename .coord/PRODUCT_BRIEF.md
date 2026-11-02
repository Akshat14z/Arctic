# Product Brief — the "why" behind Handshake

Owner: **humans only**. Both agents read this before making any product, UX, copy or docs decision.

## 0. Positioning — the USP (read this first)

> **"Same deal, in both languages."**
> Translation apps help you talk. Handshake makes sure you agreed to the same thing, and proves it if you didn't.

Every competitor (§4a) translates **words**. Handshake guarantees **shared meaning**, as one chain no one else has:

| Stage | Feature | Promise |
|---|---|---|
| Before sending | **Meaning Guard** + **Tone Guard** | "What you say is what they read, and how you meant it" |
| Agreeing | **Deal Card** → **Handshake Seal** (QR receipt) | "What you agreed is written down, and anyone can verify it" |
| When it goes wrong | **Three languages, one room** + **Show me what they saw** | "Disputes are settled on evidence, by an agent who doesn't need to speak either language" |
| Over time | **Kept-deal score** | "Reputation comes from deals kept, not stars" |
| Growth | **WhatsApp-group launcher** | "Paste a link where your buyers already are" |

**The pitch line, used everywhere** (README, write-up, video, landing page): *Same deal, in both languages.*

**Signature demo moments:** "2 lakh" → "₹2,00,000 (≈ $2,400)" before it's sent · a Hindi seller, a Japanese buyer and an English-only agent in one chat · the agent's "Show me what they saw" view · scanning the Handshake Seal.

**Never lead with** translation itself (Alibaba already does it), scam detection (generic), or any error rate we haven't measured.

Feature tiers and the kill rule: D-020 and BACKLOG.

## 1. The insight (our 30% innovation score rests on this)

Translation in commerce doesn't just make chat easier — **it creates disputes.** "₹2 lakh" can be rendered as "2 lakh" or "200 rupees". "Next Friday" means different dates in different timezones. A seller's "approximately new" becomes "new". Then both sides believe they agreed to different things, and a support agent has to work out who said what, in which language.

Handshake makes the chat itself the trust layer:
- **Meaning Guard** catches or clarifies risky content (numbers, currencies, units, ambiguity) *before* it is sent.
- **Deal Card** turns the negotiation into structured terms both sides agree to in their own language.
- **Scam shield** flags off-platform payment, gift cards, and similar patterns.
- **Tone Guard** warns when a message may come across ruder or pushier in the other language than the sender meant (e.g. Hindi haggling read literally in Japanese).
- **Handshake Seal** turns an agreed Deal Card into a receipt with a QR code that anyone can verify on our site, e.g. at pickup.
- **Dispatch center** gives a human agent the bilingual transcript, the frozen deal card and an AI summary, so disputes are resolved on evidence.

⚠️ **Honesty caveat:** we have not yet proven that modern AI translation gets "2 lakh" wrong often. Task H-03 tests this. If errors are rare, we pitch Meaning Guard as *clarity* (always show both sides the same normalized amount, e.g. "₹2,00,000 ≈ $2,400") rather than *error catching* (DECISIONS D-013). **Never claim an error rate we haven't measured** in UI copy, docs or the video.

⚠️ **Scope caveat:** timezone-aware date checks are on the cut list. "Next Friday" may be used to *describe the problem*, but no UI copy, doc or video may suggest Handshake catches date or timezone mistakes.

## 2. Users and beachhead

**India itself is a cross-language marketplace**: 22 scheduled languages, and a Tamil-speaking seller and a Hindi-speaking buyer face this problem without leaving the country.

- Beachhead (confirmed or changed by H-04): college and hostel buy/sell communities with students from many states, and small local sellers we can onboard personally.
- Personas:
  - **Seller** — comfortable in their own language, often on a phone, wants to sell without fear of being misunderstood.
  - **Buyer** — wants to know exactly what they're agreeing to.
  - **Agent** — that's us (Dhrumil and Akshat) during the hackathon; later, marketplace support staff.
- Design implications: mobile-first, minimal typing, big tap targets, everything in the user's chosen language including system messages and errors.

## 3. The demo story (build the product so this works flawlessly)

1. A seller writes in Hindi; the buyer reads in another language (Japanese in the demo, to show global reach; Tamil also works).
2. The seller types "2 lakh" → Meaning Guard shows the normalized amount before sending.
3. The Deal Card appears and both sides agree in their own language.
4. Later, the buyer says the item is different and taps **Get help**.
5. In seconds, an **English-only agent** opens the case: the frozen Deal Card (snapshot taken when the case opened, C6), the AI summary, and **"Show me what they saw"** — the exact text each side had on screen. Three people read one chat in three languages, and the agent resolves it.
6. The seller tries "send money on WhatsApp" → the scam shield fires.
7. (If built) The buyer shows the **Handshake Seal** QR at pickup; scanning it shows the verified deal.

One story covers all three track requirements. The seeded demo data (AKSHAT-T13) must reproduce it exactly.

## 4. The competition bar

A strong public entry exists: **GuardRail Buyer** (github.com/mubudot/guardrail-buyer-nexconn) — AI purchase approvals in a Nexconn group chat. Its strengths set the bar for judge experience:
- A live demo link and a one-click `/try` sandbox with no sign-up. → **We match:** DHRUMIL-T11.
- A "for judges, in 3 minutes" section at the top of the README. → **We match:** DHRUMIL-T13.
- A big test suite and a clear "what existed before vs. built for the challenge" disclosure. → **We match:** `pnpm smoke` (AKSHAT-T09) + disclosure in README and write-up.
- Automatic offline fallback if Nexconn is unreachable. → **We don't match, on purpose** (D-016): our friendly error and reconnect states (DHRUMIL-T08) cover it.

Its weakness: Nexconn is a bolt-on to a PayPal project. **Our edge: chat *is* our product.**

## 4a. The wider landscape (research, Nov 2)

Many sources are vendor marketing; treat their numbers as claims.

| Category | Who | What they do | What's missing compared with us |
|---|---|---|---|
| Translated marketplace chat | Alibaba (Alibaba Translate) | Translates buyer–seller messages, reportedly billions a week | Translation only: no meaning check, no agreed terms, no dispute evidence |
| | eBay (Microsoft Translator), Etsy | Translate **listings** and search | Chat translation unconfirmed (eBay) or absent (Etsy) |
| Translated support chat | Unbabel inside Zendesk / Intercom | Near real-time support chat translation, AI + human editors, paid | Only customer ↔ agent; the agent never sees the original buyer–seller conversation |
| India | Meesho; ONDC Saarthi + Bhashini; Sarvam | Hindi/English support voice bot; multilingual shopping app screens; Indic translation engine (Swiggy on Sarvam's Indus) | None translate conversations between buyers and sellers |
| Scam detection | Sardine, marketplace safety guidance | Moving the deal off-platform (WhatsApp, payment links) is the main sign of a purchase scam; catch it in chat, not afterwards | Confirms our scam shield targets the right signal |

**What this means for us:**
1. **Translated chat alone is not new.** Pitch Meaning Guard, the Deal Card and dispute evidence first; translation is the baseline.
2. **Our line for the write-up:** support tools translate the customer ↔ agent conversation; our agent gets the original buyer–seller conversation in both languages plus the frozen Deal Card.
3. **Evidence for Meaning Guard, used honestly:** a 2021 study (Melbourne, Facebook, Twitter) found major commercial MT systems fail many numerical tests; a 2025 study found LLMs do worst on large-unit numbers, the category closest to lakh/crore. No rigorous lakh/crore study exists. We may say "research shows translation systems make number errors"; we may **not** claim a lakh/crore error rate (H-03 still decides, D-013).
4. **H-03 suggestion:** test Sarvam or Bhashini alongside a general LLM — both are built for Indian languages and may handle Hinglish better. Switching provider is a `DECISION` (D-005 allows any provider via env).

Sources: [Alibaba Cloud](https://www.alibabacloud.com/blog/601042) · [Microsoft × eBay](https://microsoft.com/en-us/translator/blog/2017/05/03/microsoft-translator-helps-ebays-global-customers-buy-and-sell-products-in-20-languages) · [Etsy](https://www.ecommercebytes.com/?p=7299) · [Unbabel for Zendesk](https://www.zendesk.co.uk/apps/chat/183919/unbabel-for-zendesk-chat) · [Unbabel × Intercom](https://unbabel.com/intercom-integrations-for-translation-how-unbabel-delivers-seamless-multilingual-customer-support/) · [Meesho](https://inc42.com/buzz/meesho-launches-genai-powered-voice-bot-for-post-order-queries) · [ONDC Saarthi](https://indianstartupnews.com/news/indian-govt-backed-ondc-introduces-saarthi-reference-app-for-businesses-to-create-multilingual-buyer-apps-7061146) · [Sarvam](https://sarvam.ai) · [Swiggy × Sarvam](https://yourstory.com/2026/03/swiggy-partners-with-sarvam-for-voice-led-multi-lingual-services) · [Sardine](https://www.sardine.ai/learn/off-platform-payment-abuse) · [Numerical MT testing, 2021](https://arxiv.org/abs/2107.08357v1) · [Numerical translation with LLMs, 2025](https://arxiv.org/abs/2501.04927) · [IndicTrans2 issue #87](https://github.com/ai4bharat/indictrans2/issues/87)

## 5. How we map to the rubric

| Score | What judges ask | What we do |
|---|---|---|
| **50% Completeness & UX** | Does it work start to end? Is it easy? | The Golden Path (CLAUDE.md §1) works flawlessly on the deployed app; one-click judge sandbox; polish counts as core work |
| **30% Innovation & scenario value** | New idea, real communication problem? | The insight in §1, shown live in the demo story |
| **20% Business & growth** | Real users on Nexconn? Path to a product? | Real users from Nov 10 on our one production Nexconn app (its App Key is submitted); business model below |

## 6. Business model (for the write-up)

- A small fee per Deal Card that both sides **agree** to (we never handle payment, so "agreed" is what we can measure; completion is a later feature).
- A paid seller plan: verified badge, priority support, more listings.
- B2B: license Meaning Guard + dispatch as a plug-in layer for existing marketplaces built on Nexconn.

## 7. Traction rules

- **Judges count active users on our Nexconn app.** So every account we register there must be either a real person or one of the small, fixed set of `demo_` accounts (D-015). The judge sandbox reuses that fixed set; it never creates a new Nexconn user per click.
- Real users only on the production app. Demo data is `demo_`-prefixed and labelled.
- Every traction number we report excludes `demo_` users, and we say so next to the number.
- Evidence to collect from day one: Nexconn console stats screenshots, number of real listings and chats, escalated and resolved cases, genuine user quotes (with permission).
- Never inflate numbers. A small honest number beats a large suspicious one.

## 8. Submission package (Dhrumil drafts, humans finalize)

Submitted by the **team leader** on Reskilll, track **Marketplace & Support** (H-08).

- **Write-up PDF**, in rubric order: (1) It works — flow, screenshots, live link, sandbox instructions; (2) Problem and idea; (3) Traction and business. Must also contain:
  - the **Nexconn App Key** (also goes in the submission form);
  - a **named list of features that use the Nexconn SDK** (required by the rules): direct channels for buyer–seller chat, group channels for 3-way cases, server-side member add for agents, server-sent system messages, `message:send` webhook, structured `extra` payloads, live delivery + history via the Web SDK;
  - the **prior-work statement**: "Everything in this repository was built during the challenge (Oct 23 – Nov 22, 2026)."
- **Demo video, 2–3 min**, on YouTube/Vimeo/Loom/Drive, viewable by anyone with the link: problem in 15 s → full Golden Path live → Meaning Guard moment → escalation to agent → traction numbers to close.
- **README:** "For judges, in 3 minutes" first; live link; one-click sandbox; architecture; Nexconn features used; AI tools used; prior-work statement.
- **Public GitHub repo** and **runnable app link**.
- **Traction proof** (bonus): console screenshot of active users + real-user counts excluding `demo_`.
