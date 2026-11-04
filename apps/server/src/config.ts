import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

  // Security
  SESSION_SECRET: z.string().default('dev_session_secret_min_32_characters_for_local_testing'),
  AGENT_ACCESS_CODE: z.string().default('dev_agent_access_code_for_local_testing_only'),

  // Optional in Phase 0 / test, required when live
  DATABASE_URL: z.string().optional(),
  NEXCONN_APP_KEY: z.string().optional(),
  NEXCONN_APP_SECRET: z.string().optional(),
  NEXCONN_AREA: z.string().default('SG'),
  NEXCONN_PRIMARY_API_DOMAIN: z.string().default('https://api.nexconn.ai'),
  NEXCONN_SECONDARY_API_DOMAIN: z.string().default('https://api-backup.nexconn.ai'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gemini-2.0-flash'),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    const result = ConfigSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid server environment configuration:', result.error.format());
      throw new Error('Environment configuration validation failed');
    }
    cachedConfig = result.data;
  }
  return cachedConfig;
}

export function resetConfigForTesting(): void {
  cachedConfig = null;
}
