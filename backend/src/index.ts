import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB }    from './db/connection.js';
import { seedDatabase } from './db/seed.js';

import authRoutes    from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import userRoutes    from './routes/users.js';

const app  = express();
const PORT = process.env['PORT'] ?? 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users',    userRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve static frontend if dist directory exists ──────────────────────────────
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`\n🚀  AttendEase API   →  http://localhost:${PORT}`);
      console.log(`   Health check     →  http://localhost:${PORT}/health`);
      console.log(`   Login            →  POST /api/auth/login\n`);
    });
  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
