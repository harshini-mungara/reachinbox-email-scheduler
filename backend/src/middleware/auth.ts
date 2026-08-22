import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
  };
}

/**
 * Authentication Middleware.
 * Synchronizes user data passed from the frontend gateway headers into PostgreSQL.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userName = req.headers['x-user-name'] as string;
    const userAvatar = req.headers['x-user-avatar'] as string;

    if (!userId || !userEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing user credentials headers (x-user-id, x-user-email).',
      });
      return;
    }

    // Upsert user in the database to keep PostgreSQL in sync with NextAuth
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
        name: userName || 'Google User',
        avatar: userAvatar || null,
      },
      create: {
        id: userId,
        googleId: userId, // Mapping userId as googleId for external identification
        email: userEmail,
        name: userName || 'Google User',
        avatar: userAvatar || null,
      },
    });

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    };

    return next();
  } catch (error: any) {
    console.error('🔒 Authentication Middleware Error:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: error.message,
    });
    return;
  }
}
