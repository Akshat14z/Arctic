import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  LangCodeSchema,
  MoneySchema,
  ApiErrorResponseSchema,
  UserSchema,
  HandshakeExtraV1Schema,
  DealSchema,
  CaseSchema,
  GuestAuthRequestSchema,
  PrepareMessageRequestSchema,
  ListingUpdateRequestSchema,
  ListingDeleteResponseSchema,
  ChatCreateResponseSchema,
  ChatDetailResponseSchema,
} from '../src/index.js';

describe('Contracts Schema Validation', () => {
  it('validates supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('hi');
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('ja');

    expect(LangCodeSchema.safeParse('hi').success).toBe(true);
    expect(LangCodeSchema.safeParse('fr').success).toBe(false);
  });

  it('validates Money schema', () => {
    const valid = MoneySchema.safeParse({ amount: 2500, currency: 'INR' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.amount).toBe(2500);
      expect(valid.data.currency).toBe('INR');
    }

    const defaultCurrency = MoneySchema.safeParse({ amount: 100 });
    expect(defaultCurrency.success).toBe(true);
    if (defaultCurrency.success) {
      expect(defaultCurrency.data.currency).toBe('INR');
    }

    const negative = MoneySchema.safeParse({ amount: -50 });
    expect(negative.success).toBe(false);
  });

  it('validates C1 ApiErrorResponse schema with snake_case uppercase code', () => {
    const validError = {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'The requested user does not exist',
        retryable: false,
      },
    };
    expect(ApiErrorResponseSchema.safeParse(validError).success).toBe(true);

    const invalidCode = {
      error: {
        code: 'userNotFound',
        message: 'Error message',
        retryable: false,
      },
    };
    expect(ApiErrorResponseSchema.safeParse(invalidCode).success).toBe(false);
  });

  it('validates User schema', () => {
    const validUser = {
      id: 'u_1234567890',
      displayName: 'Akshat',
      language: 'en',
      role: 'user',
      isDemo: false,
    };
    const parsed = UserSchema.safeParse(validUser);
    expect(parsed.success).toBe(true);
  });

  it('validates HandshakeExtraV1 message payload', () => {
    const validExtra = {
      v: 1,
      kind: 'text',
      orig: { lang: 'hi', text: 'नमस्ते, यह फोन कितने का है?' },
      tr: { en: 'Hello, how much is this phone?' },
      guard: {
        issues: [
          {
            kind: 'currency',
            span: '2 lakh',
            explanation: { en: 'Detected informal currency format', hi: 'अनौपचारिक मुद्रा प्रारूप' },
            suggestion: '₹2,00,000 (≈ $2,400)',
          },
        ],
        acknowledged: true,
      },
    };
    const parsed = HandshakeExtraV1Schema.safeParse(validExtra);
    expect(parsed.success).toBe(true);
  });

  it('validates Deal schema', () => {
    const validDeal = {
      id: 'd_123',
      listingId: 'l_456',
      channelId: 'ch_789',
      item: { en: 'iPhone 15 Pro 128GB', hi: 'आईफोन 15 प्रो 128जीबी' },
      price: { amount: 65000, currency: 'INR' },
      quantity: 1,
      conditions: { en: ['Original box included', 'Cash on pickup'] },
      agreedBy: { buyer: new Date().toISOString() },
      status: 'proposed',
    };
    const parsed = DealSchema.safeParse(validDeal);
    expect(parsed.success).toBe(true);
  });

  it('validates Case schema', () => {
    const validCase = {
      id: 'c_abc123',
      channelId: 'ch_direct_01',
      groupChannelId: 'ch_group_01',
      buyer: {
        id: 'u_buyer1',
        displayName: 'Rahul',
        language: 'hi',
        role: 'user',
        isDemo: true,
      },
      seller: {
        id: 'u_seller1',
        displayName: 'Kenji',
        language: 'ja',
        role: 'user',
        isDemo: true,
      },
      reason: 'item_not_as_described',
      status: 'open',
      languages: ['hi', 'ja'],
      createdAt: new Date().toISOString(),
      slaDueAt: new Date(Date.now() + 3600000).toISOString(),
    };
    const parsed = CaseSchema.safeParse(validCase);
    expect(parsed.success).toBe(true);
  });

  it('validates Auth and PrepareMessage request bodies', () => {
    const authReq = GuestAuthRequestSchema.safeParse({
      displayName: 'Dhrumil',
      language: 'en',
    });
    expect(authReq.success).toBe(true);

    const prepareReq = PrepareMessageRequestSchema.safeParse({
      channelId: 'ch_123',
      text: 'Can you deliver this by Friday?',
      senderLang: 'en',
    });
    expect(prepareReq.success).toBe(true);
  });

  it('validates ListingUpdateRequest and ListingDeleteResponse schemas', () => {
    const validUpdate = ListingUpdateRequestSchema.safeParse({
      title: 'Updated iPhone 15',
      price: { amount: 65000, currency: 'INR' },
    });
    expect(validUpdate.success).toBe(true);

    const emptyTitle = ListingUpdateRequestSchema.safeParse({
      title: '',
    });
    expect(emptyTitle.success).toBe(false);

    const validDelete = ListingDeleteResponseSchema.safeParse({
      success: true,
      id: 'l_123',
    });
    expect(validDelete.success).toBe(true);
  });

  it('validates ChatCreateResponse and ChatDetailResponse schemas', () => {
    const mockUser = {
      id: 'u_seller1',
      displayName: 'Seller One',
      language: 'en' as const,
      role: 'user' as const,
      isDemo: false,
    };
    const mockListing = {
      id: 'l_123',
      sellerId: 'u_seller1',
      title: 'Headphones',
      description: 'Good condition',
      lang: 'en' as const,
      price: { amount: 2000, currency: 'INR' as const },
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    const validCreate = ChatCreateResponseSchema.safeParse({
      channelId: 'ch_u_buyer1_l_123',
      channelType: 'direct',
      seller: mockUser,
      listing: mockListing,
    });
    expect(validCreate.success).toBe(true);

    const validDetail = ChatDetailResponseSchema.safeParse({
      channelId: 'ch_u_buyer1_l_123',
      channelType: 'direct',
      listingId: 'l_123',
      buyerId: 'u_buyer1',
      sellerId: 'u_seller1',
      buyer: { ...mockUser, id: 'u_buyer1', displayName: 'Buyer One' },
      seller: mockUser,
      listing: mockListing,
      createdAt: new Date().toISOString(),
    });
    expect(validDetail.success).toBe(true);
  });
});

