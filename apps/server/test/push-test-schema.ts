// Creates or updates the tables in the isolated "test" schema (never the production "public" one).
import { execSync } from 'node:child_process';
import './setup.ts';

if (!/[?&]schema=test(&|$)/.test(process.env.DATABASE_URL ?? '')) throw new Error('DATABASE_URL is not on the test schema');
execSync('prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit', env: process.env });
