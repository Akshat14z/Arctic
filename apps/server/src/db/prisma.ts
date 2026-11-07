import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Prisma Client Singleton for ConvoCart Fastify Server.
 * Prevents multiple connection pool instantiations across hot-reloads and route modules.
 */
// Tests must never touch production tables: they run against the "test" Postgres schema (test/setup.ts).
if (process.env.NODE_ENV === 'test' && !/[?&]schema=test(&|$)/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Refusing to connect: tests must use DATABASE_URL with schema=test (see apps/server/test/setup.ts)');
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

