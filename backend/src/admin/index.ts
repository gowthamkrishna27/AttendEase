/**
 * admin/index.ts
 *
 * Aggregates all admin sub-routers under a single Express Router.
 * Applies verifyToken + requireAdmin to the entire /api/admin namespace —
 * password.routes.ts selectively relaxes requireAdmin for the /me/password route.
 *
 * Mount this in src/index.ts:
 *   app.use('/api/admin', adminRouter);
 */
import { Router } from 'express';
import { verifyToken }   from '../middleware/auth.js';
import { requireAdmin }  from '../middleware/requireAdmin.js';

import studentRoutes  from './routes/student.routes.js';
import importRoutes   from './routes/import.routes.js';
import userRoutes     from './routes/user.routes.js';
import passwordRoutes     from './routes/password.routes.js';
import databaseRoutes     from './routes/database.routes.js';
import invigilationRoutes from './routes/invigilation.routes.js';

const adminRouter = Router();

// All admin routes require a valid JWT
adminRouter.use(verifyToken);

// Most routes require admin role — password.routes.ts handles the /me exception
adminRouter.use(requireAdmin);

// ── Student CRUD ──────────────────────────────────────────────────────────────
// /import must be registered before /:id routes so the literal "import" path
// is not captured as a dynamic :id param.
adminRouter.use('/students/import', importRoutes);
adminRouter.use('/students',        studentRoutes);

// ── User management ───────────────────────────────────────────────────────────
// password.routes.ts is mounted under /users so its /me/password and /:id/password
// paths resolve relative to /api/admin/users/...
adminRouter.use('/users', passwordRoutes);
adminRouter.use('/users', userRoutes);

// ── Invigilation Management ───────────────────────────────────────────────────
adminRouter.use('/invigilation', invigilationRoutes);

// ── Database Explorer ─────────────────────────────────────────────────────────
adminRouter.use('/database', databaseRoutes);

export default adminRouter;
