# Switching from MongoDB to Neon (Postgres + Prisma)

This guide covers everything needed to go from the current MongoDB/Mongoose stack
to Neon (serverless Postgres) + Prisma 7 with the `@prisma/adapter-neon` driver.
The architecture was designed for this — the switch is **4 steps and ~5 line changes**.

---

## Prerequisites

All packages are already installed. Nothing to `npm install`.

```
@prisma/client          ✅ installed
prisma                  ✅ installed (CLI)
@neondatabase/serverless ✅ installed
@prisma/adapter-neon    ✅ installed
ws                      ✅ installed
```

---

## Step 1 — Get your Neon DATABASE_URL

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a project (or use an existing one)
3. Click **Connection string** → select **Pooled connection** (important for serverless)
4. Copy the string — it looks like:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2 — Set DATABASE_URL in `.env`

Open `backend/.env` and uncomment the last line:

```env
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> [!IMPORTANT]
> Use the **pooled** connection string (it has a hostname ending in `.neon.tech`, not `.pooler.`).
> The `@prisma/adapter-neon` handles connection pooling itself.

---

## Step 3 — Run the migration

This creates the `User` and `Request` tables (and all indexes) in your Neon database:

```bash
cd backend
npx prisma migrate dev --name init
```

If you're deploying to production instead of dev:

```bash
npx prisma migrate deploy
```

> [!NOTE]
> You'll need to re-seed the database. Update `src/db/seed.ts` to use Prisma
> instead of `UserModel.bulkWrite`. A Prisma seed example is at the bottom of this file.

---

## Step 4 — Swap the repository imports (2 lines)

### In `src/admin/services/student.service.ts` — line 12

```diff
-import * as studentRepo from '../repositories/student.repository.js';
+import * as studentRepo from '../repositories/prisma/student.repository.prisma.js';
```

### In `src/admin/services/user.service.ts` — line 4

```diff
-import * as userRepo from '../repositories/user.repository.js';
+import * as userRepo from '../repositories/prisma/user.repository.prisma.js';
```

That's it. No other file needs to change — not the services, controllers, routes, validators, or types.

---

## Step 5 — Remove MongoDB dependencies (optional cleanup)

Once fully migrated and tested:

```bash
npm uninstall mongoose
```

Remove from `src/index.ts`:
```diff
-import { connectDB }    from './db/connection.js';
-import { seedDatabase } from './db/seed.js';
```

Remove MongoDB-specific files:
- `src/db/connection.ts`
- `src/db/seed.ts`
- `src/models/User.ts`
- `src/models/Request.ts`

Remove from `.env`:
```
MONGODB_URI=...
```

---

## Architecture: why the switch is this simple

The repository layer is the only DB-aware code. Services, controllers, routes, validators, and types are all DB-agnostic:

```
Services  →  Repository Interface  →  Mongoose implementation  (current)
                                  →  Prisma implementation    (future)
```

Both implementations satisfy the same TypeScript interface (`IStudentRepository`, `IUserRepository`). The switch is purely an import path change.

---

## Prisma seed script (for Neon)

After migrating, replace your `src/db/seed.ts` with this Prisma-based version:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);

async function seed() {
  const hash = (pw: string) => bcrypt.hash(pw, SALT_ROUNDS);

  await prisma.user.createMany({
    data: [
      {
        userId:     'admin-001',
        name:       'System Admin',
        email:      'admin@college.edu',
        role:       'admin',
        department: 'CSIT',
        password:   await hash('admin123'),
        isActive:   true,
      },
      // ... add more users
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeded database');
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

Run it: `npx tsx src/db/seed.ts`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `DATABASE_URL is not set` | Uncomment it in `.env` |
| `Can't reach database server` | Make sure you're using the **pooled** connection string from Neon |
| `P2002: Unique constraint failed` | A user with that email/userId already exists — check for duplicates |
| `Error: @prisma/client was not generated` | Run `npx prisma generate` |
| Migration fails in production | Use `npx prisma migrate deploy` instead of `migrate dev` |
