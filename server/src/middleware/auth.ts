import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, type IUser } from '../models/User';
import { verifySignedPayload } from '../utils/crypto';
import { AppError } from './errorHandler';

export const SESSION_COOKIE_NAME = 'repolens_session';
export const CSRF_COOKIE_NAME = 'repolens_csrf';
export const OAUTH_STATE_COOKIE_NAME = 'repolens_oauth_state';

export interface SessionPayload {
  userId: string;
  exp: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawCookie = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawCookie || typeof rawCookie !== 'string') {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const session = verifySignedPayload<SessionPayload>(rawCookie);
    if (!session || session.exp < Date.now()) {
      throw new AppError(401, 'Session expired or invalid', 'UNAUTHORIZED');
    }

    const user = await User.findById(session.userId);
    if (!user) {
      throw new AppError(401, 'User account not found', 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken || typeof cookieToken !== 'string') {
    next(new AppError(403, 'Missing CSRF token', 'CSRF_INVALID'));
    return;
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    next(new AppError(403, 'Invalid CSRF token', 'CSRF_INVALID'));
    return;
  }

  next();
}