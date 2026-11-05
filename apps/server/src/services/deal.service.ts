import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import type {
  Deal,
  DealStatus,
  LangCode,
  Money,
  SealDetailResponse,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { translateText } from './translation.service.js';

const ALL_LANGUAGES: LangCode[] = ['en', 'hi', 'ta', 'te', 'kn', 'bn', 'mr', 'ja'];

function buildDefaultConditions(deliveryMethod: 'pickup' | 'shipping'): Record<LangCode, string[]> {
  if (deliveryMethod === 'shipping') {
    return {
      en: ['Item matches listing description', 'Safe packaging and shipping', 'Handshake Seal verified'],
      hi: ['विवरण के अनुसार वस्तु', 'सुरक्षित पैकेजिंग और शिपिंग', 'हैंडशेक सील सत्यापित'],
      ta: ['பொருளின் விவரக்குறிப்புகளுக்கு பொருந்துகிறது', 'பாதுகாப்பான பேக்கேஜிங் மற்றும் ஷிப்பிங்', 'ஹேண்ட்ஷேக் முத்திரை சரிபார்க்கப்பட்டது'],
      te: ['వస్తువు వివరాలకు సరిపోలుతుంది', 'సురక్షిత ప్యాకేజింగ్ మరియు షిప్పింగ్', 'హ్యాండ్‌షేక్ సీల్ ధృవీకరించబడింది'],
      kn: ['ವಸ್ತು ವಿವರಣೆಗೆ ಸರಿಹೊಂದುತ್ತದೆ', 'ಸುರಕ್ಷಿತ ಪ್ಯಾಕಿಂಗ್ ಮತ್ತು ಶಿಪ್ಪಿಂಗ್', 'ಹ್ಯಾಂಡ್‌ಶೇಕ್ ಸೀಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ'],
      bn: ['বিবরণ অনুযায়ী আইটেম', 'নিরাপদ প্যাকেজিং ও শিপিং', 'হ্যান্ডশেক সিল যাচাইকৃত'],
      mr: ['वर्णनानुसार वस्तू', 'सुरक्षित पॅकेजिंग आणि शिपिंग', 'हँडशेक सील सत्यापित'],
      ja: ['商品の説明と一致', '安全な梱包と発送', 'ハンドシェイクシール確認済み'],
    };
  }

  return {
    en: ['Item matches listing description', 'Inspected in person upon handover', 'Handshake Seal verified'],
    hi: ['विवरण के अनुसार वस्तु', 'हैंडओवर पर व्यक्तिगत रूप से निरीक्षण', 'हैंडशेक सील सत्यापित'],
    ta: ['பொருளின் விவரக்குறிப்புகளுக்கு பொருந்துகிறது', 'நேரில் சரிபார்க்கப்பட்டது', 'ஹேண்ட்ஷேக் முத்திரை சரிபார்க்கப்பட்டது'],
    te: ['వస్తువు వివరాలకు సరిపోలుతుంది', 'హ్యాండోవర్ సమయంలో వ్యక్తిగతంగా పరిశీలించబడింది', 'హ్యాండ్‌షేక్ సీల్ ధృవీకరించబడింది'],
    kn: ['ವಸ್ತು ವಿವರಣೆಗೆ ಸರಿಹೊಂದುತ್ತದೆ', 'ಹಸ್ತಾಂತರದ ಸಮಯದಲ್ಲಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ', 'ಹ್ಯಾಂಡ್‌ಶೇಕ್ ಸೀಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ'],
    bn: ['বিবরণ অনুযায়ী আইটেম', 'হস্তান্তরের সময় व्यक्तिगतভাবে পরিদর্শন', 'হ্যান্ডশেক সিল যাচাইকৃত'],
    mr: ['वर्णनानुसार वस्तू', 'हस्तांतरणाच्या वेळी तपासणी', 'हँडशेक सील सत्यापित'],
    ja: ['商品の説明と一致', '手渡し時に直接確認', 'ハンドシェイクシール確認済み'],
  };
}

/**
 * Extracts a Deal proposal from the chat context, listing, and negotiation history.
 */
export async function extractDeal(channelId: string, userId: string): Promise<Deal> {
  const chat = await prisma.chat.findUnique({
    where: { channelId },
    include: {
      listing: {
        include: {
          translations: true,
        },
      },
      buyer: true,
      seller: true,
    },
  });

  if (!chat) {
    throw new AppError('CHAT_NOT_FOUND', 'Chat conversation not found', 404);
  }

  if (chat.buyerId !== userId && chat.sellerId !== userId) {
    throw new AppError('FORBIDDEN', 'Only participants in this conversation can extract or view deal proposals', 403);
  }

  // Fetch recent transcripts to extract price / shipping details
  const transcriptLines = await prisma.transcriptLine.findMany({
    where: { channelId },
    orderBy: { at: 'desc' },
    take: 20,
  });

  // 1. Determine price (scan transcripts for explicit negotiated figures, or fallback to listing price)
  const currency = (chat.listing.priceCurrency || 'INR') as Money['currency'];
  let extractedPrice: Money = {
    amount: chat.listing.priceAmount,
    currency,
  };

  for (const line of transcriptLines) {
    const origText = line.origText || '';
    const priceMatch =
      origText.match(/(?:₹|rs\.?|inr|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      origText.match(/([0-9,]+)\s*(?:rs|rupees|inr|bucks)/i);

    if (priceMatch && priceMatch[1]) {
      const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        extractedPrice = {
          amount: parsed,
          currency,
        };
        break; // Use most recent negotiated price
      }
    }
  }

  // 2. Determine delivery method
  let deliveryMethod: 'pickup' | 'shipping' = 'pickup';
  for (const line of transcriptLines) {
    const origText = (line.origText || '').toLowerCase();
    if (
      origText.includes('ship') ||
      origText.includes('courier') ||
      origText.includes('post') ||
      origText.includes('parcel')
    ) {
      deliveryMethod = 'shipping';
      break;
    }
  }

  // 3. Multilingual item map
  const itemMap: Partial<Record<LangCode, string>> = {};
  const listingLang = chat.listing.lang as LangCode;
  itemMap[listingLang] = chat.listing.title;

  for (const tr of chat.listing.translations) {
    itemMap[tr.lang as LangCode] = tr.title;
  }

  // Ensure all supported languages are populated
  for (const lang of ALL_LANGUAGES) {
    if (!itemMap[lang]) {
      try {
        itemMap[lang] = await translateText(chat.listing.title, listingLang, lang);
      } catch {
        itemMap[lang] = chat.listing.title;
      }
    }
  }

  // Check if an existing proposed deal exists
  const existingDeal = await prisma.deal.findFirst({
    where: {
      channelId,
      status: 'proposed',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingDeal) {
    // If an existing proposal is unagreed, update it with fresh details
    if (!existingDeal.agreedBuyerAt && !existingDeal.agreedSellerAt) {
      const updatedDealData: Deal = {
        id: existingDeal.id,
        listingId: chat.listingId,
        channelId: chat.channelId,
        item: itemMap as Record<LangCode, string>,
        price: extractedPrice,
        quantity: 1,
        delivery: { method: deliveryMethod },
        conditions: buildDefaultConditions(deliveryMethod),
        agreedBy: {},
        status: 'proposed',
      };

      await prisma.deal.update({
        where: { id: existingDeal.id },
        data: {
          payload: updatedDealData as unknown as Prisma.InputJsonValue,
        },
      });

      return updatedDealData;
    }

    return existingDeal.payload as unknown as Deal;
  }

  // Create new Deal
  const dealId = `d_${randomBytes(6).toString('hex')}`;
  const dealData: Deal = {
    id: dealId,
    listingId: chat.listingId,
    channelId: chat.channelId,
    item: itemMap as Record<LangCode, string>,
    price: extractedPrice,
    quantity: 1,
    delivery: { method: deliveryMethod },
    conditions: buildDefaultConditions(deliveryMethod),
    agreedBy: {},
    status: 'proposed',
  };

  await prisma.deal.create({
    data: {
      id: dealId,
      channelId: chat.channelId,
      listingId: chat.listingId,
      payload: dealData as unknown as Prisma.InputJsonValue,
      status: 'proposed',
    },
  });

  return dealData;
}

/**
 * Mutual agreement logic.
 * When both buyer and seller agree, freezes deal into 'agreed' status and generates unguessable sealCode.
 */
export async function agreeToDeal(dealId: string, userId: string): Promise<Deal> {
  const dealRecord = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      chat: {
        include: {
          buyer: true,
          seller: true,
        },
      },
    },
  });

  if (!dealRecord) {
    throw new AppError('DEAL_NOT_FOUND', 'Deal proposal not found', 404);
  }

  const isBuyer = dealRecord.chat.buyerId === userId;
  const isSeller = dealRecord.chat.sellerId === userId;

  if (!isBuyer && !isSeller) {
    throw new AppError('FORBIDDEN', 'Only participants in this deal can agree to it', 403);
  }

  const existingPayload = dealRecord.payload as unknown as Deal;

  // If already agreed, return payload
  if (dealRecord.status === 'agreed') {
    return existingPayload;
  }

  const now = new Date();
  let agreedBuyerAt = dealRecord.agreedBuyerAt;
  let agreedSellerAt = dealRecord.agreedSellerAt;

  if (isBuyer) {
    agreedBuyerAt = agreedBuyerAt || now;
  }
  if (isSeller) {
    agreedSellerAt = agreedSellerAt || now;
  }

  const bothAgreed = Boolean(agreedBuyerAt && agreedSellerAt);
  const newStatus: DealStatus = bothAgreed ? 'agreed' : 'proposed';
  const sealCode = bothAgreed
    ? dealRecord.sealCode || `s_${randomBytes(8).toString('hex')}`
    : undefined;

  const updatedPayload: Deal = {
    ...existingPayload,
    status: newStatus,
    sealCode: sealCode || existingPayload.sealCode,
    agreedBy: {
      buyer: agreedBuyerAt ? agreedBuyerAt.toISOString() : undefined,
      seller: agreedSellerAt ? agreedSellerAt.toISOString() : undefined,
    },
  };

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      agreedBuyerAt,
      agreedSellerAt,
      status: newStatus,
      sealCode,
      payload: updatedPayload as unknown as Prisma.InputJsonValue,
    },
  });

  return updatedPayload;
}

/**
 * Public, unauthenticated verification of a sealed deal.
 */
export async function getSealByCode(
  sealCode: string,
  _lang?: LangCode
): Promise<SealDetailResponse> {
  const dealRecord = await prisma.deal.findUnique({
    where: { sealCode },
    include: {
      chat: {
        include: {
          buyer: true,
          seller: true,
        },
      },
    },
  });

  if (!dealRecord || dealRecord.status !== 'agreed') {
    throw new AppError('SEAL_NOT_FOUND', 'Seal not found or deal has not been finalized', 404);
  }

  const deal = dealRecord.payload as unknown as Deal;
  const sealedAt = (
    dealRecord.agreedBuyerAt && dealRecord.agreedSellerAt
      ? dealRecord.agreedBuyerAt > dealRecord.agreedSellerAt
        ? dealRecord.agreedBuyerAt
        : dealRecord.agreedSellerAt
      : dealRecord.updatedAt
  ).toISOString();

  return {
    deal,
    sealedAt,
    buyer: {
      displayName: dealRecord.chat.buyer.displayName,
    },
    seller: {
      displayName: dealRecord.chat.seller.displayName,
    },
  };
}
