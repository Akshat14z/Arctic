import { z } from 'zod';
import { LangCodeSchema } from './c1-conventions.js';
import { DealSchema } from './c5-deals.js';

export const GuardIssueKindSchema = z.enum([
  'number_format',
  'currency',
  'date',
  'unit',
  'ambiguity',
  'scam_signal',
  'tone',
]);
export type GuardIssueKind = z.infer<typeof GuardIssueKindSchema>;

export const GuardIssueSchema = z.object({
  kind: GuardIssueKindSchema,
  span: z.string().min(1),
  explanation: z.record(LangCodeSchema, z.string()),
  suggestion: z.string().optional(),
});
export type GuardIssue = z.infer<typeof GuardIssueSchema>;

export const SystemEventSchema = z.object({
  event: z.enum(['case_opened', 'case_claimed', 'case_resolved', 'scam_warning']),
  caseId: z.string().optional(),
  text: z.record(LangCodeSchema, z.string()),
});
export type SystemEvent = z.infer<typeof SystemEventSchema>;

export const HandshakeExtraV1Schema = z.object({
  v: z.literal(1),
  kind: z.enum(['text', 'deal_card', 'system', 'voice_note']),
  orig: z.object({
    lang: LangCodeSchema,
    text: z.string(),
  }),
  tr: z.record(LangCodeSchema, z.string()),
  audioUrl: z.string().optional(),
  audioDurationSec: z.number().optional(),
  guard: z
    .object({
      issues: z.array(GuardIssueSchema),
      acknowledged: z.boolean(),
    })
    .optional(),
  deal: DealSchema.optional(),
  system: SystemEventSchema.optional(),
});
export type HandshakeExtraV1 = z.infer<typeof HandshakeExtraV1Schema>;

export const PreparedMessageSchema = z.object({
  messageText: z.string(),
  extra: HandshakeExtraV1Schema,
  guard: z.object({
    issues: z.array(GuardIssueSchema),
    blocking: z.boolean(),
  }),
});
export type PreparedMessage = z.infer<typeof PreparedMessageSchema>;

