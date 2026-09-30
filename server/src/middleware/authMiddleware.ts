import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

export const JWT_SECRET = process.env.JWT_SECRET || 'anon_chat_super_secure_jwt_secret_key_2026';

export interface AuthenticatedUser {
  id: string;
  anonymous_username: string;
  role: 'user' | 'admin';
  preferences: any;
  is_suspended: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Check against database to ensure account is valid, not suspended, and up-to-date
    const result = await pool.query(
      `SELECT id, anonymous_username, role, preferences, is_suspended 
       FROM users 
       WHERE id = $1;`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    const user = result.rows[0];

    if (user.is_suspended) {
      res.status(403).json({ error: 'Account suspended. Please contact administrator.' });
      return;
    }

    req.user = {
      id: user.id,
      anonymous_username: user.anonymous_username,
      role: user.role,
      preferences: user.preferences,
      is_suspended: user.is_suspended,
    };

    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
}
