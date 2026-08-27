/**
 * prisma.config.ts
 *
 * Prisma 7 minimal config — only what's needed for `prisma migrate`.
 * The runtime PrismaClient lives in src/db/prisma.ts.
 *
 * References:
 *   https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
