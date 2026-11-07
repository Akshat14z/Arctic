// Runs before every test file (vitest.config.ts). Points Prisma at the isolated "test" schema in the same
// database, so tests and `pnpm smoke` never write to the production tables. Create it once with:
//   pnpm --filter @convocart/server db:push:test
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') });
const withTestSchema = (url?: string) => (url ? url.replace(/([?&])schema=[^&]*/, '$1').replace(/[?&]$/, '') + (url.includes('?') ? '&' : '?') + 'schema=test' : url);
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = withTestSchema(process.env.DATABASE_URL);
process.env.DIRECT_URL = withTestSchema(process.env.DIRECT_URL);
