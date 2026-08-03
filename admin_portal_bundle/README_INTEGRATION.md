# Admin Portal Integration & Integration Guide

This guide provides complete technical documentation for the **Admin Portal Module**, along with step-by-step instructions for copying, connecting, and integrating it into another version or instance of the application.

---

## 📁 Package Structure (`admin_portal_bundle/`)

All files required for the Admin Portal, Rate Limiting, and Prisma/Neon scalability have been bundled into `admin_portal_bundle/`:

```
admin_portal_bundle/
├── README_INTEGRATION.md             ← This master integration guide
├── backend/
│   ├── src/
│   │   ├── admin/                    ← Modular Admin Backend (Config, Types, Validators, Repos, Services, Controllers, Routes)
│   │   │   ├── config/admin.config.ts
│   │   │   ├── types/                (student.types.ts, user.types.ts, import.types.ts)
│   │   │   ├── validators/           (student.validator.ts, user.validator.ts, import.validator.ts)
│   │   │   ├── repositories/         (Mongoose & Prisma implementations + Interfaces)
│   │   │   │   ├── interfaces/
│   │   │   │   └── prisma/
│   │   │   ├── services/             (student.service.ts, user.service.ts, password.service.ts, import.service.ts)
│   │   │   ├── controllers/          (student.controller.ts, user.controller.ts, password.controller.ts, import.controller.ts)
│   │   │   ├── routes/               (student.routes.ts, user.routes.ts, password.routes.ts, import.routes.ts)
│   │   │   └── index.ts              (Admin aggregate router)
│   │   ├── middleware/
│   │   │   ├── requireAdmin.ts       ← Admin role-guard middleware
│   │   │   ├── errorHandler.ts       ← Centralized Express error handler
│   │   │   └── rateLimiter.ts        ← Configurable IP rate limiter
│   │   └── db/
│   │       └── prisma.ts             ← Singleton PrismaClient with @prisma/adapter-neon
│   ├── prisma/
│   │   └── schema.prisma             ← Prisma 7 schema for Neon Postgres
│   ├── prisma.config.ts              ← Prisma 7 migration config
│   └── SWITCH_TO_PRISMA.md           ← Database switch reference
└── frontend/
    └── src/
        └── pages/
            └── admin/                ← Frontend Admin pages (Dashboard, Login, Users, Settings)
```

---

## 🏛️ Admin Module Architecture & Features

The Admin Module uses a strict **6-layer decoupled design**:

```
Routes  →  Controllers  →  Services  →  Repository Interface  →  DB Implementation (Mongoose / Prisma)
```

### Core Features Included:
1. **Student Details Management (CRUD)**:
   - Full Create, Read (paginated + searchable), Update, and Soft-Delete capabilities on student records.
2. **User Management**:
   - Create, update roles (Student, Faculty, HOD, Admin), and soft-delete user accounts.
   - **Last-Admin Guard**: Intercepts and blocks deletion attempts if only 1 active admin exists.
3. **Password Management**:
   - **Self-Service Password Change**: `PATCH /api/admin/users/me/password` (requires current password).
   - **Admin Password Reset**: `PATCH /api/admin/users/:id/password` (elevated admin privilege).
4. **Bulk Excel / CSV Import**:
   - Stream-parses uploaded `.xlsx` or `.csv` files in memory using `exceljs` without storing temporary files on disk.
   - Validates rows using canonical Zod schemas, performs batch duplicate checks, and returns a detailed `ImportReport` (inserted/skipped/failed).
5. **Soft-Delete Strategy**:
   - Records set `isActive: false` instead of hard deletion, preserving audit integrity.
6. **Rate Limiting**:
   - In-memory rate limiting middleware protecting authentication endpoints against brute-force attacks.
7. **Prisma 7 & Neon Scalability**:
   - Prepared driver adapter (`@prisma/adapter-neon`) routing queries over HTTP/WebSocket for Neon serverless environments.

---

## 🛠️ Step-by-Step Guide to Connect Admin Portal to Target App

### Step 1: Copy Bundled Files
Copy the contents of `admin_portal_bundle/` into your target application:
- Copy `admin_portal_bundle/backend/src/admin` → `target-backend/src/admin`
- Copy `admin_portal_bundle/backend/src/middleware/*` → `target-backend/src/middleware/`
- Copy `admin_portal_bundle/backend/src/db/prisma.ts` → `target-backend/src/db/prisma.ts`
- Copy `admin_portal_bundle/backend/prisma/schema.prisma` → `target-backend/prisma/schema.prisma`
- Copy `admin_portal_bundle/backend/prisma.config.ts` → `target-backend/prisma.config.ts`
- Copy `admin_portal_bundle/frontend/src/pages/admin` → `target-frontend/src/pages/admin`

---

### Step 2: Install Required Dependencies

#### Backend Dependencies:
```bash
cd target-backend
npm install zod exceljs multer @prisma/client @neondatabase/serverless @prisma/adapter-neon ws
npm install -D @types/multer @types/ws prisma
```

---

### Step 3: Configure Environment Variables

Add the following environment variables to your target backend `.env` file:

```env
# Admin Security & Password Policy
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_NUMBER=true

# Excel Import Settings
MAX_IMPORT_FILE_SIZE_MB=10
IMPORT_DUPLICATE_STRATEGY=skip

# Neon Serverless Postgres (when using Prisma)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

---

### Step 4: Mount Backend Routes & Middleware

In your target backend's main entry point (e.g. `src/index.ts`):

```typescript
import express from 'express';
import adminRouter from './admin/index.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());

// 1. Rate-limit login & authentication routes (e.g., 100 requests per 15 minutes)
app.use('/api/auth', rateLimiter(15 * 60 * 1000, 100), authRoutes);

// 2. Mount Admin API namespace
app.use('/api/admin', adminRouter);

// 3. Centralized error handler (MUST be registered after all routes)
app.use(globalErrorHandler);
```

---

### Step 5: Configure Frontend Routes & Navigation

In your target frontend's router (e.g. `App.tsx`):

```tsx
import { Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';

function App() {
  return (
    <Routes>
      {/* Admin Login & Portal */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
    </Routes>
  );
}
```

---

### Step 6: Database Setup (Prisma + Neon or Mongoose)

#### Option A: Mongoose (Default / Active)
The admin module works out-of-the-box with Mongoose using the existing `User` model (`role: 'student' | 'faculty' | 'hod' | 'admin'`).

#### Option B: Switch to Neon (Postgres + Prisma)
To switch the admin module to Neon serverless Postgres:
1. Run migration:
   ```bash
   npx prisma migrate dev --name init
   ```
2. Update repository imports in `src/admin/services/student.service.ts` and `src/admin/services/user.service.ts`:
   ```typescript
   // student.service.ts
   import * as studentRepo from '../repositories/prisma/student.repository.prisma.js';

   // user.service.ts
   import * as userRepo from '../repositories/prisma/user.repository.prisma.js';
   ```

---

## 🔒 Verification & Testing Commands

To verify integration into the target application:

```bash
# 1. Type-check backend
cd target-backend && npx tsc --noEmit

# 2. Type-check frontend
cd target-frontend && npx tsc --noEmit

# 3. Test Admin Login API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@college.edu","password":"admin123","role":"admin"}'

# 4. Test Student List API
curl http://localhost:3000/api/admin/students \
  -H "Authorization: Bearer <TOKEN>"
```
