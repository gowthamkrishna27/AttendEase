import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { prisma }        from './db/prisma.js';

import authRoutes         from './routes/auth.js';
import requestRoutes      from './routes/requests.js';
import userRoutes         from './routes/users.js';
import notificationRoutes  from './routes/notifications.js';
import adminRouter from './admin/index.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

const app  = express();
const PORT = process.env['PORT'] ?? 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          rateLimiter(15 * 60 * 1000, 100), authRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRouter);

// ── Root & Health check ───────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: 'postgresql', timestamp: new Date().toISOString() });
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
  res.status(404).json({ error: 'Not found' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await prisma.$connect();
    console.log('✅  PostgreSQL connected (Prisma)');

    let currentPort = Number(PORT);

    function tryListen(p: number) {
      const server = app.listen(p, () => {
        console.log(`\n🚀  AttendEase API   →  http://localhost:${p}`);
        console.log(`   Health check     →  http://localhost:${p}/health`);
        console.log(`   Database         →  PostgreSQL (Neon)`);
        console.log(`   Login            →  POST /api/auth/login\n`);

        // Seed initial data in background after server is up
        seedDatabase().catch((err) => console.error('Seed warning:', err));
      });

      const shutdown = async () => {
        await prisma.$disconnect();
        server.close(() => process.exit(0));
      };

      process.once('SIGTERM', shutdown);
      process.once('SIGINT',  shutdown);

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️  Port ${p} is in use. Trying port ${p + 1}...`);
          server.close();
          tryListen(p + 1);
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
