import { z } from 'zod';

/**
 * Supported Languages in Handshake / ConvoCart (v0)
 * Per D-010: India beachhead (en, hi, ta, te, kn, bn, mr) + ja for international demo
 */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'kn', 'bn', 'mr', 'ja'] as const;

export const LangCodeSchema = z.enum(SUPPORTED_LANGUAGES);
export type LangCode = z.infer<typeof LangCodeSchema>;

/**
 * Standard Money Schema (C1)
 * Amount in major currency units (e.g., 500 for ₹500, not paise)
 */
export const MoneySchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).default('INR'),
});
export type Money = z.infer<typeof MoneySchema>;

/**
 * Standard API Error Response Body (C1)
 * HTTP status accompanied by this structured body
 */
export const ApiErrorDetailSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]+$/, 'Error code must be SNAKE_CASE uppercase'),
  message: z.string().min(1, 'Error message is required'),
  retryable: z.boolean(),
});
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = z.object({
  error: ApiErrorDetailSchema,
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Common ISO 8601 UTC timestamp validator
 */
export const IsoDateTimeSchema = z.string().datetime({ message: 'Must be an ISO 8601 UTC timestamp' });
