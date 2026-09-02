import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { prisma }        from './db/prisma.js';

import authRoutes         from './routes/auth.js';
import requestRoutes      from './routes/requests.js';
import shareRoutes        from './routes/share.js';
import userRoutes         from './routes/users.js';
import notificationRoutes  from './routes/notifications.js';
import attendanceRoutes    from './routes/attendance.js';
import invigilationRoutes from './routes/invigilation.js';
import adminRouter from './admin/index.js';
import chatRoutes from './routes/chat.js';
import activitiesRoutes from './routes/activities.js';
import coordinatorRoutes from './routes/coordinators.js';
import { getCanonicalRosterForYear } from './services/rosterService.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const app  = express();
const PORT = process.env['PORT'] ?? 3000;

app.disable('x-powered-by');

// ── Security Headers Middleware (Clickjacking, MIME, XSS Protection, Anti-Caching) ──
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none';");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Prevent intermediate and shared proxy caching of sensitive API data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
// ── CORS Configuration (Secure Whitelist) ───────────────────────────────────
const explicitAllowedOrigins = [
  'https://iattendease.vercel.app',
  'https://getpermission.vercel.app',
  'https://attend-ease-hmi8.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:4173',
];

if (process.env['FRONTEND_URL']) {
  explicitAllowedOrigins.push(process.env['FRONTEND_URL'].replace(/\/+$/, ''));
}
if (process.env['CORS_ALLOWED_ORIGINS']) {
  explicitAllowedOrigins.push(...process.env['CORS_ALLOWED_ORIGINS'].split(',').map(s => s.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);

    const isAllowed =
      explicitAllowedOrigins.includes(origin) ||
      /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Coordinator-Code'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',              rateLimiter(15 * 60 * 1000, 100), authRoutes);
app.use('/api/requests',          requestRoutes);
app.use('/api/share',             shareRoutes);
app.use('/api/users',             userRoutes);
app.use('/api/notifications',     notificationRoutes);
app.use('/api/attendance',        attendanceRoutes);
app.use('/api/invigilation',       invigilationRoutes);
app.use('/api/activities',        activitiesRoutes);
app.use('/api/admin/coordinators', coordinatorRoutes);
app.use('/api/admin',             adminRouter);
app.use('/api/chat',              chatRoutes);

// Canonical Student Roster API
app.get('/api/students/roster', async (req, res) => {
  try {
    const { year } = req.query;
    const rosterData = await getCanonicalRosterForYear(typeof year === 'string' ? year : undefined);
    res.json({
      year: rosterData.year,
      sections: rosterData.sections,
    });
  } catch (error) {
    console.error('GET /api/students/roster error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Root & Health check ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

app.get('/', (_req, res) => {
  res.json({
    name:      'AttendEase Backend API',
    db:        'PostgreSQL (Prisma)',
    status:    'online',
    health:    'http://localhost:3000/health',
    frontend:  'http://localhost:5173',
    endpoints: ['/api/auth', '/api/requests', '/api/users'],
  });
});

// ── Serve static frontend ONLY in production mode if dist exists ───────────────
if (process.env['NODE_ENV'] === 'production') {
  const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }
}

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none';");
  res.status(404).json({ error: 'Not found' });
});

// ── Auto-sync Postgres Enums ──────────────────────────────────────────────────
async function syncDatabaseEnums() {
  const reasons = [
    'internship',
    'startup',
    'project_development',
    'medical',
    'sports',
    'family_emergency',
    'competition',
    'other',
  ];
  for (const val of reasons) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "RequestReason" ADD VALUE IF NOT EXISTS '${val}'`);
    } catch {
      // Ignore if table/enum not created yet or already exists
    }
  }

  const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
  for (const val of statuses) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS '${val}'`);
    } catch {}
  }

  const roles = ['student', 'faculty', 'hod', 'admin'];
  for (const val of roles) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${val}'`);
    } catch {}
  }
}

// ── Auto-sync Postgres Tables ─────────────────────────────────────────────────
async function syncDatabaseTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "permission_request_share_links" (
        "id" TEXT NOT NULL,
        "requestId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3),
        "revokedAt" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastAccessedAt" TIMESTAMP(3),
        CONSTRAINT "permission_request_share_links_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "permission_request_share_links_token_key" UNIQUE ("token"),
        CONSTRAINT "permission_request_share_links_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "permission_request_share_links_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permission_request_share_links_requestId_idx" ON "permission_request_share_links"("requestId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permission_request_share_links_token_idx" ON "permission_request_share_links"("token");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permission_request_share_links_createdBy_idx" ON "permission_request_share_links"("createdBy");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "permission_request_share_links_isActive_idx" ON "permission_request_share_links"("isActive");`);
  } catch (err) {
    console.warn('⚠️ syncDatabaseTables notice:', err);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await prisma.$connect();
    console.log('✅  PostgreSQL connected (Prisma)');

    // Ensure database enums match Prisma schema
    await syncDatabaseEnums();
    await syncDatabaseTables();

    let currentPort = Number(PORT);

    function tryListen(p: number) {
      const server = app.listen(p, () => {
        console.log(`\n🚀  AttendEase API   →  http://localhost:${p}`);
        console.log(`   Health check     →  http://localhost:${p}/health`);
        console.log(`   Database         →  PostgreSQL (Supabase)`);
        console.log(`   Login            →  POST /api/auth/login\n`);

        // Server successfully listening
      });

      const shutdown = async () => {
        await prisma.$disconnect();
        server.close(() => process.exit(0));
      };

      process.once('SIGTERM', shutdown);
      process.once('SIGINT',  shutdown);

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️  Port ${p} busy during reload. Retrying in 400ms...`);
          setTimeout(() => {
            tryListen(p);
          }, 400);
        } else {
          console.error('❌  Server error:', err);
          process.exit(1);
        }
      });
    }

    tryListen(currentPort);
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

bootstrap();
