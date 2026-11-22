// One-off: move the demo chat to a fresh Nexconn channel (DEMO_CHANNEL_ID) and replay its scripted conversation
// plus the agreed Deal Card, so judges never see test messages from the old channel. Also fixes the demo deal's
// seed copy (Japanese title, no circular "Handshake Seal verified" term) in the deal and the case's frozen copy.
//
//   npx tsx --env-file=../../.env scripts/replay-demo-chat.ts          # dry run: prints what it would do
//   npx tsx --env-file=../../.env scripts/replay-demo-chat.ts --send   # does it
//
// Fixed demo_ users only (D-015). Run once per new DEMO_CHANNEL_ID: running --send twice posts the messages twice.
import type { Deal, HandshakeExtraV1, LangCode } from '@convocart/contracts';
import { prisma } from '../src/db/prisma.js';
import { DEMO_CHANNEL_ID, seedDemoEnvironment } from '../src/services/demo.service.js';
import { ensureChatGroupChannel } from '../src/nexconn/channels.js';
import { getNexconnMessageApi } from '../src/nexconn/client.js';
import { translateText } from '../src/services/translation.service.js';

const SEND = process.argv.includes('--send');
const JA_TITLE = 'ヴィンテージ セイコー 自動巻き腕時計（1978年）';
const CIRCULAR = /handshake seal verified|सील सत्यापित|シール確認済み|முத்திரை சரிபார்க்கப்பட்டது|సీల్ ధృవీకరించబడింది|ಸೀಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ|সিল যাচাইকৃত/i;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fixDeal(d: Deal): Deal {
  const conditions = Object.fromEntries(
    Object.entries(d.conditions).map(([lang, list]) => [lang, (list ?? []).filter((c) => !CIRCULAR.test(c))]),
  ) as Deal['conditions'];
  return { ...d, channelId: DEMO_CHANNEL_ID, item: { ...d.item, ja: JA_TITLE }, conditions };
}

async function main() {
  if (process.env.NODE_ENV === 'test') throw new Error('Refusing to run under NODE_ENV=test');
  console.log(SEND ? 'SENDING' : 'DRY RUN (add --send to apply)', '->', DEMO_CHANNEL_ID);

  // 1. The seed renames the old demo chat row to DEMO_CHANNEL_ID; deals, cases and transcript lines move with it.
  if (SEND) await seedDemoEnvironment();
  const chat = await prisma.chat.findFirst({
    where: { buyerId: 'demo_u_buyer', listingId: 'demo_l_vintage_watch' },
    include: { listing: { include: { translations: true } } },
  });
  if (!chat) throw new Error('No demo chat row');
  console.log('chat row:', chat.channelId);

  // 2. Seed copy in the deal and in each case's frozen copy.
  const deals = await prisma.deal.findMany({ where: { channelId: chat.channelId }, orderBy: { createdAt: 'asc' } });
  const cases = await prisma.case.findMany({ where: { channelId: chat.channelId } });
  console.log(`deals: ${deals.length}, cases: ${cases.length}`);
  if (SEND) {
    for (const d of deals) await prisma.deal.update({ where: { id: d.id }, data: { payload: fixDeal(d.payload as unknown as Deal) as object } });
    for (const c of cases) if (c.dealSnapshot) await prisma.case.update({ where: { id: c.id }, data: { dealSnapshot: fixDeal(c.dealSnapshot as unknown as Deal) as object } });
  }

  // 3. The Nexconn group for the new id, with buyer and seller as members.
  if (SEND) await ensureChatGroupChannel({ channelId: DEMO_CHANNEL_ID, name: 'Vintage Seiko Automatic Watch (1978)', buyerId: chat.buyerId, sellerId: chat.sellerId });

  // 4. Replay: the recorded conversation (C4 text messages), then the agreed Deal Card (C4 deal_card).
  const lines = await prisma.transcriptLine.findMany({ where: { channelId: chat.channelId }, orderBy: { at: 'asc' } });
  const api = getNexconnMessageApi();
  const send = async (from: string, text: string, extra: HandshakeExtraV1) => {
    console.log(`  ${from}: ${text.slice(0, 60)}`);
    if (!SEND) return;
    const res = await api.sendGroupChannelMessage({
      fromUserId: from,
      toChannelIds: [DEMO_CHANNEL_ID],
      messageType: 'RC:TxtMsg',
      content: JSON.stringify({ content: text, extra: JSON.stringify(extra) }),
      isEchoToSender: 1, // each side must also see its own messages in its history
    });
    if (res.data.code && res.data.code !== 200 && res.data.code !== 0) throw new Error(`Nexconn send failed: ${res.data.code}`);
    await wait(400); // keep the order
  };
  // Fill any missing translation for the three demo readers BEFORE sending anything: a half-translated replay
  // can't be undone (Nexconn history is permanent). Known translations first, then the model; abort if any is missing.
  const KNOWN: Record<string, Partial<Record<LangCode, string>>> = {
    'नमस्ते! क्या यह घड़ी अभी भी उपलब्ध है? क्या यह ठीक से चलती है?': { ja: 'こんにちは！この時計はまだ購入可能ですか？正常に動作しますか？' },
  };
  const filled = [];
  for (const l of lines) {
    const tr = { ...((l.tr as Record<string, string>) ?? {}) };
    for (const to of ['en', 'hi', 'ja'] as const) {
      if (to === l.origLang || tr[to]) continue;
      const t = KNOWN[l.origText]?.[to] ?? (await translateText(l.origText, l.origLang as LangCode, to));
      if (!t) throw new Error(`Missing ${to} translation for "${l.origText}". Nothing was sent; run again.`);
      tr[to] = t;
      console.log(`  + ${to}: ${t}`);
    }
    filled.push({ l, tr });
  }
  for (const { l, tr } of filled) {
    if (SEND && JSON.stringify(tr) !== JSON.stringify(l.tr)) await prisma.transcriptLine.update({ where: { nexconnMessageId: l.nexconnMessageId }, data: { tr } });
    await send(l.fromId, l.origText, { v: 1, kind: 'text', orig: { lang: l.origLang as LangCode, text: l.origText }, tr: tr as Record<LangCode, string> });
  }
  const agreed = [...deals].reverse().find((d) => d.status === 'agreed');
  if (agreed) {
    const deal = fixDeal(agreed.payload as unknown as Deal);
    const text = `Offer: ${deal.item.en} · ₹${deal.price.amount.toLocaleString('en-IN')} · agreed by both`;
    await send(chat.buyerId, text, { v: 1, kind: 'deal_card', orig: { lang: 'en', text }, tr: {}, deal });
  }
  console.log(SEND ? 'done' : 'dry run complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
