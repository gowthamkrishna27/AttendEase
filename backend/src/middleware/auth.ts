import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'student' | 'faculty' | 'hod' | 'admin';
  name: string;
  department: string;
  rollNumber?: string;
  semester?: number;
  avatarUrl?: string;
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env['JWT_SECRET'] || 'attendease_dev_secret_key_2026';

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '36500d' });
}
