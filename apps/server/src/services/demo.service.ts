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
const DEMO_CHANNEL_ID = 'ch_demo_watch_2';

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
    update: { imageUrl: demoPhoto },
    create: {
      imageUrl: demoPhoto,
      id: DEMO_LISTING_ID,
      sellerId: DEMO_USERS.seller.id,
      title: 'Vintage Seiko Automatic Watch (1978)',
      description: 'Authentic vintage Japanese automatic timepiece in pristine working condition. Original leather strap included.',
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
