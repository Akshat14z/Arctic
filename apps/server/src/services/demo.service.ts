import type { AuthResponse, LangCode } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { getConfig } from '../config.js';
import {
  formatUser,
  generateSessionToken,
  hashToken,
  obtainNexconnToken,
} from './auth.service.js';

interface DemoUserDefinition {
  id: string;
  displayName: string;
  language: LangCode;
  role: 'user' | 'agent';
  agentLanguages?: LangCode[];
}

const DEMO_USERS: Record<'buyer' | 'seller' | 'agent', DemoUserDefinition> = {
  buyer: {
    id: 'demo_u_buyer',
    displayName: 'Priya Sharma (Demo)',
    language: 'hi',
    role: 'user',
  },
  seller: {
    id: 'demo_u_seller',
    displayName: 'Kenji Sato (Demo)',
    language: 'ja',
    role: 'user',
  },
  agent: {
    id: 'demo_u_agent',
    displayName: 'Sarah Jenkins (Demo Agent)',
    language: 'en',
    role: 'agent',
    agentLanguages: ['en', 'hi', 'ja'],
  },
};

const DEMO_LISTING_ID = 'demo_l_vintage_watch';
// Bump the suffix to give the demo chat a fresh, empty Nexconn conversation (Nexconn keeps history per id,
// and server-side history can't be edited on our plan). _2: reset after D-029 moved chats to groups.
// _5: fresh history without test messages; the scripted conversation is replayed by scripts/replay-demo-chat.ts
// (_3 lacked echo to the sender; _4 lost one translation to a model timeout).
export const DEMO_CHANNEL_ID = 'ch_demo_watch_5';

// The watch is Kenji's, written in Japanese; English and Hindi readers get the stored translations.
const WATCH = {
  ja: { title: 'ヴィンテージ セイコー 自動巻き腕時計（1978年）', description: '1978年製の日本の自動巻き腕時計。動作は良好で、時間も正確です。純正の革ベルト付き。' },
  en: { title: 'Vintage Seiko Automatic Watch (1978)', description: 'Authentic vintage Japanese automatic timepiece in pristine working condition. Original leather strap included.' },
  hi: { title: 'विंटेज सेइको ऑटोमैटिक घड़ी (1978)', description: 'उत्कृष्ट स्थिति में प्रामाणिक विंटेज जापानी स्वचालित घड़ी। मूल लेदर स्ट्रैप शामिल है।' },
};

type Copy = { title: string; description: string };
/** More demo listings so Browse isn't two cards. Sold by the existing demo users only: no new accounts (D-015). */
const MORE_LISTINGS: { id: string; seller: 'seller' | 'buyer'; lang: 'ja' | 'hi'; price: number; copy: Record<'ja' | 'hi' | 'en', Copy> }[] = [
  { id: 'demo_l_film_camera', seller: 'seller', lang: 'ja', price: 18500, copy: {
    ja: { title: 'キヤノン AE-1 フィルムカメラ（50mm レンズ付き）', description: 'シャッター、露出計ともに動作確認済み。レンズにカビやくもりはありません。ストラップ付き。' },
    en: { title: 'Canon AE-1 film camera with 50mm lens', description: 'Shutter and light meter tested and working. No fungus or haze in the lens. Strap included.' },
    hi: { title: 'कैनन AE-1 फ़िल्म कैमरा (50mm लेंस के साथ)', description: 'शटर और लाइट मीटर जाँचे हुए, ठीक काम करते हैं। लेंस में फफूंद या धुंध नहीं। स्ट्रैप साथ में।' } } },
  { id: 'demo_l_headphones', seller: 'seller', lang: 'ja', price: 14000, copy: {
    ja: { title: 'ソニー WH-1000XM4 ノイズキャンセリングヘッドホン', description: '2年使用。バッテリーの持ちは良好です。ケースと充電ケーブル付き。' },
    en: { title: 'Sony WH-1000XM4 noise-cancelling headphones', description: 'Used for two years. Battery still lasts well. Case and charging cable included.' },
    hi: { title: 'सोनी WH-1000XM4 नॉइज़-कैंसलिंग हेडफ़ोन', description: 'दो साल इस्तेमाल हुए। बैटरी अब भी अच्छी चलती है। केस और चार्जिंग केबल साथ में।' } } },
  { id: 'demo_l_rice_cooker', seller: 'seller', lang: 'ja', price: 6200, copy: {
    ja: { title: '象印 炊飯器（5.5合）', description: '帰国のため出品します。内釜のコーティングはきれいです。説明書付き。' },
    en: { title: 'Zojirushi rice cooker (5.5 cups)', description: 'Selling before I move back home. The inner pot coating is clean. Manual included.' },
    hi: { title: 'ज़ोजिरुशी राइस कुकर (5.5 कप)', description: 'घर लौटने से पहले बेच रहा हूँ। अंदर के बर्तन की कोटिंग साफ़ है। मैनुअल साथ में।' } } },
  { id: 'demo_l_jlpt_books', seller: 'seller', lang: 'ja', price: 1200, copy: {
    ja: { title: '日本語能力試験 N3 参考書セット（4冊）', description: '文法、語彙、読解、聴解の4冊。書き込みはほとんどありません。' },
    en: { title: 'JLPT N3 study books, set of 4', description: 'Grammar, vocabulary, reading and listening. Almost no writing inside.' },
    hi: { title: 'JLPT N3 की पढ़ाई की किताबें (4 का सेट)', description: 'व्याकरण, शब्दावली, पढ़ना और सुनना। अंदर लगभग कुछ नहीं लिखा।' } } },
  { id: 'demo_l_cycle', seller: 'buyer', lang: 'hi', price: 4500, copy: {
    hi: { title: 'हरक्यूलिस साइकिल, 26 इंच', description: 'कॉलेज में एक साल चलाई। नए टायर और ब्रेक। ताला साथ में।' },
    en: { title: 'Hercules bicycle, 26 inch', description: 'Ridden for one year at college. New tyres and brakes. Lock included.' },
    ja: { title: 'ヘラクレス 自転車（26インチ）', description: '大学で1年間使用。タイヤとブレーキは新品です。鍵付き。' } } },
  { id: 'demo_l_textbooks', seller: 'buyer', lang: 'hi', price: 1800, copy: {
    hi: { title: 'इंजीनियरिंग पहले साल की किताबें (6 का सेट)', description: 'गणित, भौतिकी, रसायन, ड्रॉइंग, प्रोग्रामिंग और अंग्रेज़ी। कुछ पन्नों पर हाइलाइट है।' },
    en: { title: 'First-year engineering textbooks, set of 6', description: 'Maths, physics, chemistry, drawing, programming and English. A few pages highlighted.' },
    ja: { title: '工学部1年生の教科書（6冊セット）', description: '数学、物理、化学、製図、プログラミング、英語。数ページにマーカーあり。' } } },
  { id: 'demo_l_study_table', seller: 'buyer', lang: 'hi', price: 1500, copy: {
    hi: { title: 'फ़ोल्डिंग स्टडी टेबल', description: 'हॉस्टल के कमरे के लिए सही। मज़बूत लकड़ी, मोड़कर रख सकते हैं। खुद आकर ले जाएँ।' },
    en: { title: 'Folding study table', description: 'Right for a hostel room. Sturdy wood, folds flat. Pickup only.' },
    ja: { title: '折りたたみ式の勉強机', description: '寮の部屋にちょうどいいサイズ。丈夫な木製で、平らに折りたためます。手渡しのみ。' } } },
];

/**
 * Seeds baseline demo data (fixed users, sample listing, and active chat).
 * Reuses existing records and guarantees never registering new throwaway Nexconn users (D-015).
 */
export async function seedDemoEnvironment(): Promise<void> {
  // 1. Ensure seller exists
  await prisma.user.upsert({
    where: { id: DEMO_USERS.seller.id },
    update: {},
    create: {
      id: DEMO_USERS.seller.id,
      displayName: DEMO_USERS.seller.displayName,
      language: DEMO_USERS.seller.language,
      role: 'user',
      isDemo: true,
      agentLanguages: [],
    },
  });

  // 2. Ensure buyer exists
  await prisma.user.upsert({
    where: { id: DEMO_USERS.buyer.id },
    update: {},
    create: {
      id: DEMO_USERS.buyer.id,
      displayName: DEMO_USERS.buyer.displayName,
      language: DEMO_USERS.buyer.language,
      role: 'user',
      isDemo: true,
      agentLanguages: [],
    },
  });

  // 3. Ensure agent exists
  await prisma.user.upsert({
    where: { id: DEMO_USERS.agent.id },
    update: {},
    create: {
      id: DEMO_USERS.agent.id,
      displayName: DEMO_USERS.agent.displayName,
      language: DEMO_USERS.agent.language,
      role: 'agent',
      isDemo: true,
      agentLanguages: DEMO_USERS.agent.agentLanguages || ['en', 'hi', 'ja'],
    },
  });

  // 4. Ensure demo listing exists. Its photo is served by the web app (Unsplash, free licence; credited in the footer).
  const demoPhoto = `${getConfig().WEB_ORIGIN.split(',')[0].trim().replace(/\/$/, '')}/demo/watch.jpg`;
  await prisma.listing.upsert({
    where: { id: DEMO_LISTING_ID },
    update: { imageUrl: demoPhoto, title: WATCH.ja.title, description: WATCH.ja.description },
    create: {
      imageUrl: demoPhoto,
      id: DEMO_LISTING_ID,
      sellerId: DEMO_USERS.seller.id,
      title: WATCH.ja.title,
      description: WATCH.ja.description,
      lang: 'ja',
      priceAmount: 15000,
      priceCurrency: 'INR',
      isDemo: true,
      translations: {
        create: [
          {
            lang: 'en',
            title: 'Vintage Seiko Automatic Watch (1978)',
            description: 'Authentic vintage Japanese automatic timepiece in pristine working condition. Original leather strap included.',
          },
          {
            lang: 'hi',
            title: 'विंटेज सेइको ऑटोमैटिक घड़ी (1978)',
            description: 'उत्कृष्ट स्थिति में प्रामाणिक विंटेज जापानी स्वचालित घड़ी। मूल लेदर स्ट्रैप शामिल है।',
          },
        ],
      },
    },
  });

  // 4b. More demo listings (created once; never overwritten, so a seller's demo edits are not undone).
  for (const l of MORE_LISTINGS) {
    const original = l.copy[l.lang];
    await prisma.listing.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        sellerId: DEMO_USERS[l.seller].id,
        title: original.title,
        description: original.description,
        lang: l.lang,
        priceAmount: l.price,
        priceCurrency: 'INR',
        isDemo: true,
        translations: { create: (['en', 'hi', 'ja'] as const).filter((x) => x !== l.lang).map((x) => ({ lang: x, ...l.copy[x] })) },
      },
    });
  }

  // 5. Ensure demo chat exists (renaming an older demo chat row moves its deals and cases with it: FK cascade)
  await prisma.chat.updateMany({
    where: { buyerId: DEMO_USERS.buyer.id, listingId: DEMO_LISTING_ID, NOT: { channelId: DEMO_CHANNEL_ID } },
    data: { channelId: DEMO_CHANNEL_ID },
  });
  await prisma.chat.upsert({
    where: { channelId: DEMO_CHANNEL_ID },
    update: {},
    create: {
      channelId: DEMO_CHANNEL_ID,
      listingId: DEMO_LISTING_ID,
      buyerId: DEMO_USERS.buyer.id,
      sellerId: DEMO_USERS.seller.id,
    },
  });

  // 6. Keep the demo help case looking like it was just opened: judges arrive days after it was seeded, and
  // "waiting 14 d" reads as broken support. Only an open case older than an hour is moved.
  const now = Date.now();
  await prisma.case.updateMany({
    where: { channelId: DEMO_CHANNEL_ID, status: 'open', createdAt: { lt: new Date(now - 60 * 60_000) } },
    data: { createdAt: new Date(now - 6 * 60_000), slaDueAt: new Date(now + 9 * 60_000) },
  });
}

/**
 * Creates or reuses a demo session for the judge sandbox (D-015).
 */
export async function createDemoSession(roleTarget: 'buyer' | 'seller' | 'agent'): Promise<AuthResponse> {
  const config = getConfig();
  const def = DEMO_USERS[roleTarget];

  // Seed / ensure data exists
  await seedDemoEnvironment();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: def.id },
  });

  // Create session
  const sessionToken = generateSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const nexconnToken = await obtainNexconnToken(user.id, user.displayName);

  return {
    sessionToken,
    user: formatUser(user),
    nexconn: {
      appKey: config.NEXCONN_APP_KEY || 'dev_app_key',
      token: nexconnToken,
      area: (config.NEXCONN_AREA as 'Singapore' | 'HongKong' | 'Beijing') || 'Singapore',
    },
  };
}
