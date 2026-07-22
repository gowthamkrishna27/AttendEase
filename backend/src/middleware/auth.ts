import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'student' | 'faculty' | 'hod';
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

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET'] as string) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env['JWT_SECRET'] as string, { expiresIn: '7d' });
}
