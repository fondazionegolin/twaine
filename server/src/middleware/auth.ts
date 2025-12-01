import { Request, Response, NextFunction } from 'express';
import { findUserById, UserPublic } from '../repositories/userRepository.js';

// Extend Express Session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export interface AuthRequest extends Request {
  user?: UserPublic;
  userId?: string;
}

/**
 * Middleware to require authentication
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is logged in via session
    if (!req.session || !req.session.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.session.userId;

    // Get user from database
    const user = await findUserById(userId);

    if (!user) {
      // User was deleted, clear session
      req.session.destroy(() => { });
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = userId;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional auth - doesn't fail if no session, but attaches user if valid
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.session && req.session.userId) {
      const user = await findUserById(req.session.userId);
      if (user) {
        req.user = user;
        req.userId = req.session.userId;
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
};
