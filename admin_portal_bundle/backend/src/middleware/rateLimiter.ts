/**
 * rateLimiter.ts
 *
 * Configurable in-memory IP rate-limiting middleware.
 * Prevents brute-force credential attacks on authentication and sensitive endpoints.
 *
 * Usage:
 *   import { rateLimiter } from './middleware/rateLimiter.js';
 *   app.use('/api/auth', rateLimiter(15 * 60 * 1000, 100), authRoutes);
 */
import type { Request, Response, NextFunction } from 'express';

const ipRequestCounts: Record<string, { count: number; resetTime: number }> = {};

export function rateLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawIp = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp) || req.ip || 'unknown';
    const now = Date.now();

    if (!ipRequestCounts[ip] || now > ipRequestCounts[ip].resetTime) {
      ipRequestCounts[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    ipRequestCounts[ip].count += 1;
    if (ipRequestCounts[ip].count > maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
      return;
    }
    next();
  };
}
