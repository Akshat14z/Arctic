import { z } from 'zod';
import { MoneySchema, LangCodeSchema } from './c1-conventions.js';

export const DealStatusSchema = z.enum(['proposed', 'agreed', 'disputed']);
export type DealStatus = z.infer<typeof DealStatusSchema>;

export const DeliverySchema = z.object({
  method: z.enum(['pickup', 'shipping']),
  date: z.string().optional(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

export const DealSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  channelId: z.string().min(1),
  item: z.record(LangCodeSchema, z.string()),
  price: MoneySchema,
  quantity: z.number().int().positive().default(1),
  delivery: DeliverySchema.optional(),
  conditions: z.record(LangCodeSchema, z.array(z.string())),
  agreedBy: z.object({
    buyer: z.string().datetime().optional(),
    seller: z.string().datetime().optional(),
  }),
  sealCode: z.string().optional(),
  status: DealStatusSchema,
});
export type Deal = z.infer<typeof DealSchema>;
