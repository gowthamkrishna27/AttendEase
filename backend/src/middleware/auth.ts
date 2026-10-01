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

const PRIMARY_SECRET = process.env['JWT_SECRET'] || 'attendease_secret_key_2026';
const SECRETS_TO_TRY = Array.from(new Set([
  PRIMARY_SECRET,
  'attendease_secret_key_2026',
  'attendease_dev_secret_key_2026',
]));

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  let verifiedPayload: JwtPayload | null = null;

  for (const secret of SECRETS_TO_TRY) {
    try {
      verifiedPayload = jwt.verify(token, secret) as JwtPayload;
      if (verifiedPayload) break;
    } catch {
      // try next candidate secret
    }
  }

  if (!verifiedPayload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = verifiedPayload;
  next();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, PRIMARY_SECRET, { expiresIn: '36500d' });
}
