import { z } from 'zod';
import { LangCodeSchema, MoneySchema } from './c1-conventions.js';
import { UserSchema, NexconnCredentialsSchema } from './c2-identity.js';
import { PreparedMessageSchema } from './c4-messages.js';
import { DealSchema } from './c5-deals.js';
import { CaseReasonSchema, CaseSchema, TranscriptLineSchema, CaseSummarySchema } from './c6-cases.js';

/* -------------------------------------------------------------------------- */
/* Listing Schemas                                                            */
/* -------------------------------------------------------------------------- */

export const ListingSchema = z.object({
  id: z.string().min(1),
  sellerId: z.string().min(1),
  seller: UserSchema.optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  lang: LangCodeSchema,
  price: MoneySchema,
  imageUrl: z.string().url().optional(),
  isDemo: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type Listing = z.infer<typeof ListingSchema>;

export const ListingCreateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().min(1, 'Description is required').max(2000),
  price: MoneySchema,
  imageUrl: z.string().url().optional(),
});
export type ListingCreateRequest = z.infer<typeof ListingCreateRequestSchema>;

export const ListingListQuerySchema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  lang: LangCodeSchema.optional(),
});
export type ListingListQuery = z.infer<typeof ListingListQuerySchema>;

export const ListingListResponseSchema = z.object({
  items: z.array(ListingSchema),
  nextCursor: z.string().optional(),
});
export type ListingListResponse = z.infer<typeof ListingListResponseSchema>;

export const ListingDetailQuerySchema = z.object({
  lang: LangCodeSchema.optional(),
});
export type ListingDetailQuery = z.infer<typeof ListingDetailQuerySchema>;

export const ListingDetailResponseSchema = z.object({
  listing: ListingSchema,
});
export type ListingDetailResponse = z.infer<typeof ListingDetailResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Auth Schemas                                                               */
/* -------------------------------------------------------------------------- */

export const GuestAuthRequestSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  language: LangCodeSchema,
});
export type GuestAuthRequest = z.infer<typeof GuestAuthRequestSchema>;

export const AgentAuthRequestSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  language: LangCodeSchema,
  agentLanguages: z.array(LangCodeSchema).min(1, 'At least one supported agent language is required'),
  code: z.string().min(1, 'Agent access code is required'),
});
export type AgentAuthRequest = z.infer<typeof AgentAuthRequestSchema>;

export const AuthResponseSchema = z.object({
  sessionToken: z.string().min(1),
  user: UserSchema,
  nexconn: NexconnCredentialsSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Me Profile Schemas                                                         */
/* -------------------------------------------------------------------------- */

export const MeResponseSchema = z.object({
  user: UserSchema,
  nexconn: NexconnCredentialsSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UpdateMeRequestSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  language: LangCodeSchema.optional(),
});
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Chat Schemas                                                               */
/* -------------------------------------------------------------------------- */

export const ChatCreateRequestSchema = z.object({
  listingId: z.string().min(1),
});
export type ChatCreateRequest = z.infer<typeof ChatCreateRequestSchema>;

export const ChatCreateResponseSchema = z.object({
  channelId: z.string().min(1),
  channelType: z.literal('direct'),
  seller: UserSchema,
  listing: ListingSchema,
});
export type ChatCreateResponse = z.infer<typeof ChatCreateResponseSchema>;

export const ChatSummarySchema = z.object({
  channelId: z.string().min(1),
  listing: ListingSchema,
  otherUser: UserSchema,
  lastMessage: z
    .object({
      text: z.string(),
      at: z.string().datetime(),
    })
    .optional(),
  unreadCount: z.number().int().nonnegative().default(0),
});
export type ChatSummary = z.infer<typeof ChatSummarySchema>;

export const ChatListResponseSchema = z.object({
  items: z.array(ChatSummarySchema),
});
export type ChatListResponse = z.infer<typeof ChatListResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Message Preparation Schemas                                                */
/* -------------------------------------------------------------------------- */

export const PrepareMessageRequestSchema = z.object({
  channelId: z.string().min(1),
  text: z.string().min(1).max(5000),
  senderLang: LangCodeSchema,
});
export type PrepareMessageRequest = z.infer<typeof PrepareMessageRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Deals & Seals Schemas                                                      */
/* -------------------------------------------------------------------------- */

export const ExtractDealRequestSchema = z.object({
  channelId: z.string().min(1),
});
export type ExtractDealRequest = z.infer<typeof ExtractDealRequestSchema>;

export const ExtractDealResponseSchema = z.object({
  deal: DealSchema.nullable(),
});
export type ExtractDealResponse = z.infer<typeof ExtractDealResponseSchema>;

export const SealDetailQuerySchema = z.object({
  lang: LangCodeSchema.optional(),
});
export type SealDetailQuery = z.infer<typeof SealDetailQuerySchema>;

export const SealDetailResponseSchema = z.object({
  deal: DealSchema,
  sealedAt: z.string().datetime(),
  buyer: z.object({ displayName: z.string() }),
  seller: z.object({ displayName: z.string() }),
});
export type SealDetailResponse = z.infer<typeof SealDetailResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Case & Escalation Schemas                                                  */
/* -------------------------------------------------------------------------- */

export const CreateCaseRequestSchema = z.object({
  channelId: z.string().min(1),
  reason: CaseReasonSchema,
  note: z.string().max(1000).optional(),
});
export type CreateCaseRequest = z.infer<typeof CreateCaseRequestSchema>;

export const CaseResponseSchema = z.object({
  case: CaseSchema,
});
export type CaseResponse = z.infer<typeof CaseResponseSchema>;

export const AgentQueueResponseSchema = z.object({
  items: z.array(CaseSchema),
});
export type AgentQueueResponse = z.infer<typeof AgentQueueResponseSchema>;

export const ResolveCaseRequestSchema = z.object({
  resolution: z.string().min(1).max(2000),
});
export type ResolveCaseRequest = z.infer<typeof ResolveCaseRequestSchema>;

export const CaseDetailResponseSchema = z.object({
  case: CaseSchema,
  transcript: z.array(TranscriptLineSchema),
  summary: CaseSummarySchema,
});
export type CaseDetailResponse = z.infer<typeof CaseDetailResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Demo Sandbox Schemas                                                       */
/* -------------------------------------------------------------------------- */

export const DemoSessionRequestSchema = z.object({
  as: z.enum(['buyer', 'seller', 'agent']),
});
export type DemoSessionRequest = z.infer<typeof DemoSessionRequestSchema>;
