import { z } from 'zod';
import { LangCodeSchema } from './c1-conventions.js';

export const RoleSchema = z.enum(['user', 'agent']);
export type Role = z.infer<typeof RoleSchema>;

export const KeptDealsSchema = z.object({
  kept: z.number().int().nonnegative(),
  total: z.number().int().positive(),
});
export type KeptDeals = z.infer<typeof KeptDealsSchema>;

export const UserSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  language: LangCodeSchema,
  role: RoleSchema,
  isDemo: z.boolean().default(false),
  agentLanguages: z.array(LangCodeSchema).optional(),
  keptDeals: KeptDealsSchema.optional(),
});
export type User = z.infer<typeof UserSchema>;

export const NexconnCredentialsSchema = z.object({
  appKey: z.string().min(1),
  token: z.string().min(1),
  area: z.string().min(1),
});
export type NexconnCredentials = z.infer<typeof NexconnCredentialsSchema>;

