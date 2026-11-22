# CommonGrounds: demo video script (2 min 45 s)

**Goal:** a judge watching once should see the full Golden Path working live (50%), understand why it is new (30%), and see a real product with a path to market (20%). Every claim in the voice-over is something the screen shows at that moment.

## Before you record

- **Three browser windows**, side by side or easy to switch:
  1. **Priya (buyer, Hindi):** a normal window at `https://arctic-swart-six.vercel.app/try?as=buyer&next=/listings`.
  2. **Kenji (seller, Japanese):** an incognito window at `https://arctic-swart-six.vercel.app/try?as=seller&next=/chats`.
  3. **Sarah (agent, English):** a second browser (or another profile) at `https://arctic-swart-six.vercel.app/try?as=agent`.
- **A phone** with its camera ready, to scan the Seal QR.
- **Don't record in the main demo chat** ("Vintage Seiko"): judges share it, and whatever you type stays there. Use a fresh chat (step 2 below). It's between the demo accounts, so it creates no new users.
- **Rehearse once.** Wake the server first by opening `https://cg-api-8b1i.onrender.com/health`. Light theme, 1440 px window, browser zoom 110 %.
- **Speak slowly.** Cut dead air in editing; the server can take a second or two.

## The script

| Time | On screen | Voice-over |
|---|---|---|
| 0:00 | Landing page, hero "Same deal. Both languages." | "When a buyer and a seller don't share a language, translation gets their words across. But not always their deal." |
| 0:10 | Scroll to the story section. | "'2 lakh' can arrive as two hundred thousand, or two hundred. Each side walks away thinking they agreed to something different. CommonGrounds makes sure they agreed to the same thing, and proves it." |
| 0:22 | **Priya's window**: Browse, in Hindi. Open the **Canon AE-1 film camera** (Kenji's). | "This is Priya. She reads Hindi, so the whole marketplace is in Hindi, even listings written in Japanese." |
| 0:32 | Tap **विक्रेता से बात करें** (Chat with the seller). Type in Hindi: `क्या यह कैमरा अभी भी उपलब्ध है?` and send. | "She messages the seller, in Hindi." |
| 0:40 | **Kenji's window**: open the new chat. The message is in Japanese. Tap **原文を見る** (See original), then back. | "Kenji reads Japanese. He gets her message in Japanese, built on Nexconn group channels, with the original one tap away." |
| 0:52 | Kenji replies in Japanese: `はい、まだあります。` Show it arriving on Priya's side in Hindi. Tap **सुनें** (Listen). | "Every message arrives in the reader's language, and she can listen to it in her own voice language." |
| 1:02 | **Priya**: type `I can pay 2 lakh` and press send. **Meaning Guard** stops it and offers **₹2,00,000**. Tap the suggestion and send. | "Here's where other apps fail. Before her message leaves, Meaning Guard catches '2 lakh', a number that's easy to misread across languages, and turns it into ₹2,00,000, so both sides see the same amount." |
| 1:18 | **Priya**: tap **ऑफ़र दें** (Make an offer), set the price, send. **Kenji**: the Deal Card appears in Japanese; tap **この取引に合意する** (Agree). **Priya** agrees too. | "When they agree on a price, it becomes a Deal Card: the same terms on both screens, each in its own language, agreed by both." |
| 1:35 | The **CommonGrounds Seal** appears with its QR code. Scan it with the phone. The phone shows **"Signed by CommonGrounds. Checked on this device."** | "And it's sealed. The QR carries a cryptographic signature. Any phone can verify it on the spot, even if our server is down. Change the price in the link and the page warns you." |
| 1:52 | **Priya**: tap **मदद लें** (Get help), choose "The item isn't as described", send. Show the calm "what happens next" screen and the frozen deal. | "Say the camera isn't as described. Priya taps Get help, and sees exactly what happens next." |
| 2:05 | **Sarah's window**: the case is in Dispatch. Open it. Show the **AI summary**, the **frozen Deal Card**, then toggle **What each side saw**. | "Sarah, the support agent, reads English. She gets an AI summary that sets the claim against the agreed terms, the deal frozen at that moment, and what each side actually saw on their screen, in their own language." |
| 2:22 | Tap **Claim this case**, type `Hi both, I've checked the deal. Let's sort this out.` Show it arriving in Hindi for Priya and in Japanese for Kenji. | "She joins one room with both of them. Three people, three languages, one conversation." |
| 2:32 | Back to the landing page, or `/try`. | "CommonGrounds: translated chat, a guard on meaning, a deal both sides sign, and help that reads both sides. Built on Nexconn. Try it yourself in one click at arctic-swart-six.vercel.app/try." |
| 2:42 | Title card: **CommonGrounds · Same deal, in both languages.** | (Pause.) |

## After recording

- Upload to YouTube as **Unlisted** (or Loom). Check that the link plays in a signed-out window.
- Put the link in the submission form and in `README.md` (the "Demo video" line).
- The case you opened stays in the queue as a second demo case. That's fine: judges will see a realistic queue.

## If something goes wrong mid-take

- **Meaning Guard doesn't trigger:** type exactly `I can pay 2 lakh`. It's the most reliable example.
- **A message is slow to appear:** keep talking; cut the wait in editing.
- **The call button:** don't show calls. They need the Call/VoIP service enabled for the App Key.
