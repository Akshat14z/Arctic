import { z } from 'zod';
import { LangCodeSchema } from './c1-conventions.js';
import { UserSchema } from './c2-identity.js';
import { DealSchema } from './c5-deals.js';

export const CaseReasonSchema = z.enum([
  'item_not_as_described',
  'payment_issue',
  'scam_suspected',
  'misunderstanding',
  'other',
]);
export type CaseReason = z.infer<typeof CaseReasonSchema>;

export const CaseStatusSchema = z.enum(['open', 'claimed', 'resolved']);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CaseSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().min(1),
  groupChannelId: z.string().min(1),
  buyer: UserSchema,
  seller: UserSchema,
  agent: UserSchema.optional(),
  reason: CaseReasonSchema,
  status: CaseStatusSchema,
  languages: z.array(LangCodeSchema),
  createdAt: z.string().datetime(),
  claimedAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
  slaDueAt: z.string().datetime(),
  dealSnapshot: DealSchema.optional(),
  resolution: z.string().optional(),
});
export type Case = z.infer<typeof CaseSchema>;

export const ShownToDetailSchema = z.object({
  lang: LangCodeSchema,
  text: z.string(),
  translated: z.boolean(),
});
export type ShownToDetail = z.infer<typeof ShownToDetailSchema>;

export const TranscriptLineSchema = z.object({
  at: z.string().datetime(),
  from: z.string().min(1),
  orig: z.object({
    lang: LangCodeSchema,
    text: z.string(),
  }),
  tr: z.record(LangCodeSchema, z.string()),
  shownTo: z.record(z.string(), ShownToDetailSchema),
});
export type TranscriptLine = z.infer<typeof TranscriptLineSchema>;

export const CaseSummarySchema = z.object({
  lang: LangCodeSchema,
  text: z.string(),
  keyFacts: z.array(z.string()),
  deal: DealSchema.optional(),
});
export type CaseSummary = z.infer<typeof CaseSummarySchema>;

