/**
 * prisma.config.ts
 *
 * Prisma 7 minimal config — only what's needed for `prisma migrate`.
 * The runtime PrismaClient (with Neon adapter) lives in src/db/prisma.ts.
 *
 * References:
 *   https://www.prisma.io/docs/orm/reference/prisma-config-reference
 *   https://www.prisma.io/docs/orm/overview/databases/neon
 */
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,

  migrate: {
    async adapter() {
      // Dynamically imported to avoid circular dep before `prisma generate` has run
      const { Pool }       = await import('@neondatabase/serverless');
      const { PrismaNeon } = await import('@prisma/adapter-neon');

      const connectionString = process.env['DATABASE_URL'];
      if (!connectionString) throw new Error('DATABASE_URL is not set');

      const pool = new Pool({ connectionString });
      return new PrismaNeon(pool);
    },
  },
});
