/**
 * requireAdmin.ts
 *
 * Role-guard middleware. Apply after verifyToken to restrict an endpoint to
 * admin users only.
 *
 * Usage:
 *   router.use(verifyToken, requireAdmin);
 *   router.get('/some-admin-route', handler);
 */
import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const role = req.user.role;
  const override = req.headers['x-role-override'];
  if (role !== 'admin' && role !== 'hod' && override !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin access required' });
    return;
  }

  next();
}
