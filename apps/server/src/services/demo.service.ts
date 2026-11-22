import type { AuthResponse, LangCode } from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { getConfig } from '../config.js';
import { formatUser, generateSessionToken, hashToken, obtainNexconnToken } from './auth.service.js';

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
  ja: {
    title: 'ヴィンテージ セイコー 自動巻き腕時計（1978年）',
    description: '1978年製の日本の自動巻き腕時計。動作は良好で、時間も正確です。純正の革ベルト付き。',
  },
  en: {
    title: 'Vintage Seiko Automatic Watch (1978)',
    description:
      'Authentic vintage Japanese automatic timepiece in pristine working condition. Original leather strap included.',
  },
  hi: {
    title: 'विंटेज सेइको ऑटोमैटिक घड़ी (1978)',
    description: 'उत्कृष्ट स्थिति में प्रामाणिक विंटेज जापानी स्वचालित घड़ी। मूल लेदर स्ट्रैप शामिल है।',
  },
};

type Copy = { title: string; description: string };
let moreListingsSeeded = false;
const RETIRED_LISTINGS = [
  'demo_l_rice_cooker',
  'demo_l_jlpt_books',
  'demo_l_cycle',
  'demo_l_textbooks',
  'demo_l_study_table',
];
/** More demo listings so Browse isn't two cards. Sold by the existing demo users only: no new accounts (D-015). */
// Photos: Unsplash, free licence, served by the web app from /demo/ (credited in the landing footer). Each listing
// describes what its photo actually shows.
const MORE_LISTINGS: {
  id: string;
  photo: string;
  seller: 'seller' | 'buyer';
  lang: 'ja' | 'hi';
  price: number;
  copy: Record<'ja' | 'hi' | 'en', Copy>;
}[] = [
  {
    id: 'demo_l_film_camera',
    photo: 'film-camera.jpg',
    seller: 'seller',
    lang: 'ja',
    price: 18500,
    copy: {
      ja: {
        title: 'キヤノン AE-1 フィルムカメラ（50mm レンズ付き）',
        description: 'シャッター、露出計ともに動作確認済み。レンズにカビやくもりはありません。ストラップ付き。',
      },
      en: {
        title: 'Canon AE-1 film camera with 50mm lens',
        description: 'Shutter and light meter tested and working. No fungus or haze in the lens. Strap included.',
      },
      hi: {
        title: 'कैनन AE-1 फ़िल्म कैमरा (50mm लेंस के साथ)',
        description: 'शटर और लाइट मीटर जाँचे हुए, ठीक काम करते हैं। लेंस में फफूंद या धुंध नहीं। स्ट्रैप साथ में।',
      },
    },
  },
  {
    id: 'demo_l_headphones',
    photo: 'headphones.jpg',
    seller: 'seller',
    lang: 'ja',
    price: 14000,
    copy: {
      ja: {
        title: 'ソニー WH-1000XM4 ノイズキャンセリングヘッドホン',
        description: '2年使用。バッテリーの持ちは良好です。ケースと充電ケーブル付き。',
      },
      en: {
        title: 'Sony WH-1000XM4 noise-cancelling headphones',
        description: 'Used for two years. Battery still lasts well. Case and charging cable included.',
      },
      hi: {
        title: 'सोनी WH-1000XM4 नॉइज़-कैंसलिंग हेडफ़ोन',
        description: 'दो साल इस्तेमाल हुए। बैटरी अब भी अच्छी चलती है। केस और चार्जिंग केबल साथ में।',
      },
    },
  },
  {
    id: 'demo_l_pot_induction',
    photo: 'pot-induction.jpg',
    seller: 'seller',
    lang: 'ja',
    price: 6200,
    copy: {
      ja: {
        title: 'ホーロー鍋とIH調理器のセット',
        description: '帰国のため出品します。鍋とIH調理器はセットでお譲りします。どちらもきれいです。',
      },
      en: {
        title: 'Enamel pot with induction cooktop',
        description: 'Selling before I move back home. The pot and the induction cooktop go together. Both are clean.',
      },
      hi: {
        title: 'इनेमल बर्तन और इंडक्शन चूल्हा',
        description: 'घर लौटने से पहले बेच रहा हूँ। बर्तन और इंडक्शन चूल्हा साथ में। दोनों साफ़ हैं।',
      },
    },
  },
  {
    id: 'demo_l_paperbacks',
    photo: 'paperbacks.jpg',
    seller: 'seller',
    lang: 'ja',
    price: 1200,
    copy: {
      ja: {
        title: '英語の自己啓発書セット（5冊、『IKIGAI』含む）',
        description: '一度読んだだけで、状態は良好です。書き込みはありません。',
      },
      en: {
        title: 'Set of 5 self-help paperbacks (English, includes Ikigai)',
        description: 'Read once, in good condition. No writing inside.',
      },
      hi: {
        title: '5 सेल्फ़-हेल्प किताबों का सेट (अंग्रेज़ी, Ikigai सहित)',
        description: 'एक बार पढ़ी हैं, अच्छी हालत में। अंदर कुछ नहीं लिखा।',
      },
    },
  },
  {
    id: 'demo_l_mountain_bike',
    photo: 'mountain-bike.jpg',
    seller: 'buyer',
    lang: 'hi',
    price: 9500,
    copy: {
      hi: {
        title: 'ट्रेक माउंटेन बाइक',
        description: 'मनाली तक चलाई है, अच्छी हालत में। नए ब्रेक। पीछे का बैग साथ में।',
      },
      en: {
        title: 'Trek mountain bike',
        description: 'Ridden up to Manali, in good shape. New brakes. Rear bag included.',
      },
      ja: {
        title: 'トレックのマウンテンバイク',
        description: 'マナリまで走りました。状態は良好です。ブレーキは新品。後ろのバッグ付き。',
      },
    },
  },
  {
    id: 'demo_l_hardcovers',
    photo: 'hardcovers.jpg',
    seller: 'buyer',
    lang: 'hi',
    price: 900,
    copy: {
      hi: {
        title: 'इंजीनियरिंग की 3 हार्डकवर किताबें',
        description: 'पहले साल की, साफ़ कवर। कुछ पन्नों पर हाइलाइट है।',
      },
      en: {
        title: '3 engineering hardcover textbooks',
        description: 'First year, clean covers. A few pages highlighted.',
      },
      ja: {
        title: '工学のハードカバー教科書 3冊',
        description: '1年生用で、表紙はきれいです。数ページにマーカーあり。',
      },
    },
  },
  {
    id: 'demo_l_oak_desk',
    photo: 'oak-desk.jpg',
    seller: 'buyer',
    lang: 'hi',
    price: 4800,
    copy: {
      hi: {
        title: 'ओक की स्टडी डेस्क, दराज़ के साथ',
        description: 'मज़बूत लकड़ी, एक दराज़ और पेन रखने की जगह। खुद आकर ले जाएँ।',
      },
      en: {
        title: 'Oak study desk with a drawer',
        description: 'Solid wood, one drawer and a pen groove. Pickup only.',
      },
      ja: {
        title: '引き出し付きのオーク材の学習机',
        description: '無垢材で、引き出しとペン置きがあります。手渡しのみ。',
      },
    },
  },
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
    update: {
      imageUrl: demoPhoto,
      title: WATCH.ja.title,
      description: WATCH.ja.description,
    },
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
            description:
              'Authentic vintage Japanese automatic timepiece in pristine working condition. Original leather strap included.',
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

  // 4b. More demo listings, written once per server process (not on every demo sign-in, which would slow /try).
  // Rewritten to the canonical copy and photo each time the server starts.
  if (!moreListingsSeeded) {
    moreListingsSeeded = true;
    const base = getConfig().WEB_ORIGIN.split(',')[0].trim().replace(/\/$/, '');
    for (const l of MORE_LISTINGS) {
      const original = l.copy[l.lang];
      const others = (['en', 'hi', 'ja'] as const).filter((x) => x !== l.lang).map((x) => ({ lang: x, ...l.copy[x] }));
      await prisma.listing.upsert({
        where: { id: l.id },
        update: {
          title: original.title,
          description: original.description,
          priceAmount: l.price,
          imageUrl: `${base}/demo/${l.photo}`,
          translations: { deleteMany: {}, create: others },
        },
        create: {
          id: l.id,
          sellerId: DEMO_USERS[l.seller].id,
          title: original.title,
          description: original.description,
          lang: l.lang,
          priceAmount: l.price,
          priceCurrency: 'INR',
          isDemo: true,
          imageUrl: `${base}/demo/${l.photo}`,
          translations: { create: others },
        },
      });
    }
    // Listings from an earlier version of this list whose photo didn't match: remove them (demo data only).
    await prisma.listing.deleteMany({
      where: { id: { in: RETIRED_LISTINGS }, isDemo: true },
    });
  }

  // 5. Ensure demo chat exists (renaming an older demo chat row moves its deals and cases with it: FK cascade)
  await prisma.chat.updateMany({
    where: {
      buyerId: DEMO_USERS.buyer.id,
      listingId: DEMO_LISTING_ID,
      NOT: { channelId: DEMO_CHANNEL_ID },
    },
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

  await refreshDemoCase();
}

/**
 * Keep the demo help case looking like it was just opened: judges arrive days after it was seeded, and
 * "waiting 14 d" reads as broken support. Only an open case older than an hour is moved.
 */
async function refreshDemoCase(): Promise<void> {
  const now = Date.now();
  await prisma.case.updateMany({
    where: {
      channelId: DEMO_CHANNEL_ID,
      status: 'open',
      createdAt: { lt: new Date(now - 60 * 60_000) },
    },
    data: {
      createdAt: new Date(now - 6 * 60_000),
      slaDueAt: new Date(now + 9 * 60_000),
    },
  });
}

// Speed (deployed API): every query is several round trips to the database, so seeding on each demo sign-in cost
// about 15 s. The seed runs once per server process (shared by concurrent sign-ins, retried if it fails); demo
// users are cached (they are read-only, DHRUMIL-030); the help-case refresh runs in the background at most every
// 10 minutes. A sign-in is then one session write plus the Nexconn token, in parallel.
let seeding: Promise<void> | null = null;
export function ensureDemoSeeded(): Promise<void> {
  seeding ??= seedDemoEnvironment().catch((err) => {
    seeding = null;
    throw err;
  });
  return seeding;
}
const demoUserCache = new Map<string, Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>>();
let lastCaseRefresh = Date.now();

/**
 * Creates or reuses a demo session for the judge sandbox (D-015).
 */
export async function createDemoSession(roleTarget: 'buyer' | 'seller' | 'agent'): Promise<AuthResponse> {
  const config = getConfig();
  const def = DEMO_USERS[roleTarget];

  await ensureDemoSeeded();
  if (Date.now() - lastCaseRefresh > 10 * 60_000) {
    lastCaseRefresh = Date.now();
    void refreshDemoCase().catch((err) => console.warn('[demo] case refresh failed', err));
  }

  let user = demoUserCache.get(def.id);
  if (!user) {
    user = await prisma.user.findUniqueOrThrow({ where: { id: def.id } });
    demoUserCache.set(def.id, user);
  }

  // Create session
  const sessionToken = generateSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // The session write and the Nexconn token don't depend on each other.
  const [, nexconnToken] = await Promise.all([
    prisma.session.create({ data: { tokenHash, userId: user.id, expiresAt } }),
    obtainNexconnToken(user.id, user.displayName),
  ]);

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
