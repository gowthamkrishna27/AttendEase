/**
 * src/db/prisma.ts
 *
 * Singleton PrismaClient configured with the @prisma/adapter-neon serverless
 * adapter. This file is NOT imported by any running code while the app runs on
 * MongoDB — it only activates when you switch imports to the Prisma repositories.
 *
 * Neon uses HTTP-based connections instead of persistent TCP sockets, which is
 * why the standard Prisma postgres provider times out in serverless environments.
 * The @prisma/adapter-neon bridge routes queries over HTTP/WebSocket instead.
 *
 * ── Setup checklist before using this module ─────────────────────────────────
 * 1. Add DATABASE_URL to .env   (Neon → your project → Connection string → Pooled)
 * 2. npx prisma migrate dev --name init
 * 3. Switch the 2 import lines in student.service.ts and user.service.ts
 *    (see SWITCH_TO_PRISMA.md for the exact lines)
 */
import { PrismaClient }  from '@prisma/client';
import { Pool }          from '@neondatabase/serverless';
import { PrismaNeon }    from '@prisma/adapter-neon';

function buildClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Prisma cannot connect to Neon. ' +
      'Copy your connection string from console.neon.tech and add it to .env.',
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as unknown as ConstructorParameters<typeof PrismaNeon>[0]);
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

// ── Singleton pattern ─────────────────────────────────────────────────────────
// tsx hot-reload on file changes would otherwise create a new PrismaClient on
// each reload, exhausting the connection pool. The global trick prevents that.

declare const globalThis: typeof global & { _prismaClient?: PrismaClient };

export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'production'
    ? buildClient()
    : (globalThis._prismaClient ??= buildClient());
