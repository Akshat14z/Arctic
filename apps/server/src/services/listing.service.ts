import { randomBytes } from 'crypto';
import type {
  Listing,
  ListingCreateRequest,
  ListingUpdateRequest,
  ListingListQuery,
  ListingListResponse,
  ListingDeleteResponse,
  LangCode,
} from '@convocart/contracts';
import { prisma } from '../db/prisma.js';
import { formatUser } from './auth.service.js';
import { AppError } from '../errors.js';

export function generateListingId(prefix = 'l'): string {
  const randomPart = randomBytes(6).toString('hex');
  return `${prefix}_${randomPart}`;
}

interface DbListingWithRelations {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  lang: string;
  priceAmount: number;
  priceCurrency: string;
  imageUrl: string | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  seller?: {
    id: string;
    displayName: string;
    language: string;
    role: string;
    isDemo: boolean;
    agentLanguages: string[];
  } | null;
  translations?: Array<{
    id: string;
    listingId: string;
    lang: string;
    title: string;
    description: string;
  }>;
}

export function formatListing(
  dbListing: DbListingWithRelations,
  requestedLang?: LangCode
): Listing {
  let title = dbListing.title;
  let description = dbListing.description;

  // Translated read resolution:
  // If requested language differs from original and a translation exists, use it.
  // Otherwise, cleanly fall back to original author content without fabrication.
  if (requestedLang && dbListing.translations && dbListing.translations.length > 0) {
    const matchedTranslation = dbListing.translations.find((t) => t.lang === requestedLang);
    if (matchedTranslation) {
      title = matchedTranslation.title;
      description = matchedTranslation.description;
    }
  }

  return {
    id: dbListing.id,
    sellerId: dbListing.sellerId,
    seller: dbListing.seller ? formatUser(dbListing.seller) : undefined,
    title,
    description,
    lang: dbListing.lang as LangCode,
    price: {
      amount: dbListing.priceAmount,
      currency: dbListing.priceCurrency as any,
    },
    imageUrl: dbListing.imageUrl || undefined,
    isDemo: dbListing.isDemo,
    createdAt: dbListing.createdAt.toISOString(),
  };
}

export async function createListing(
  sellerId: string,
  input: ListingCreateRequest
): Promise<Listing> {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
  });

  if (!seller) {
    throw new AppError('USER_NOT_FOUND', 'Seller user record not found', 404, false);
  }

  const listingId = generateListingId('l');

  const created = await prisma.listing.create({
    data: {
      id: listingId,
      sellerId: seller.id,
      title: input.title.trim(),
      description: input.description.trim(),
      lang: seller.language,
      priceAmount: input.price.amount,
      priceCurrency: input.price.currency || 'INR',
      imageUrl: input.imageUrl || null,
      isDemo: seller.isDemo,
    },
    include: {
      seller: true,
      translations: true,
    },
  });

  return formatListing(created);
}

export async function getListings(
  query: ListingListQuery
): Promise<ListingListResponse> {
  const pageSize = 20;
  const where: any = {};

  if (query.q && query.q.trim()) {
    const term = query.q.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.listing.findMany({
    where,
    take: pageSize + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    include: {
      seller: true,
      translations: true,
    },
  });

  let nextCursor: string | undefined = undefined;
  let resultItems = items;

  if (items.length > pageSize) {
    const nextItem = items[pageSize];
    nextCursor = nextItem.id;
    resultItems = items.slice(0, pageSize);
  }

  return {
    items: resultItems.map((item) => formatListing(item, query.lang)),
    nextCursor,
  };
}

export async function getListingById(
  id: string,
  requestedLang?: LangCode
): Promise<Listing> {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: true,
      translations: true,
    },
  });

  if (!listing) {
    throw new AppError('LISTING_NOT_FOUND', `Listing with ID ${id} not found`, 404, false);
  }

  return formatListing(listing, requestedLang);
}

export async function updateListing(
  id: string,
  currentUserId: string,
  input: ListingUpdateRequest
): Promise<Listing> {
  const existing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('LISTING_NOT_FOUND', `Listing with ID ${id} not found`, 404, false);
  }

  // Authorization check: User can only update their own listings
  if (existing.sellerId !== currentUserId) {
    throw new AppError('FORBIDDEN', 'You are not authorized to modify this listing', 403, false);
  }

  const dataToUpdate: any = {};
  if (input.title !== undefined) {
    dataToUpdate.title = input.title.trim();
  }
  if (input.description !== undefined) {
    dataToUpdate.description = input.description.trim();
  }
  if (input.price !== undefined) {
    dataToUpdate.priceAmount = input.price.amount;
    if (input.price.currency) {
      dataToUpdate.priceCurrency = input.price.currency;
    }
  }
  if (input.imageUrl !== undefined) {
    dataToUpdate.imageUrl = input.imageUrl;
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: dataToUpdate,
    include: {
      seller: true,
      translations: true,
    },
  });

  return formatListing(updated);
}

export async function deleteListing(
  id: string,
  currentUserId: string
): Promise<ListingDeleteResponse> {
  const existing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('LISTING_NOT_FOUND', `Listing with ID ${id} not found`, 404, false);
  }

  // Authorization check: User can only delete their own listings
  if (existing.sellerId !== currentUserId) {
    throw new AppError('FORBIDDEN', 'You are not authorized to delete this listing', 403, false);
  }

  await prisma.listing.delete({
    where: { id },
  });

  return {
    success: true,
    id,
  };
}

