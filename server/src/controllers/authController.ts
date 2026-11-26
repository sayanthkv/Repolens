import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import {
  encryptSecret,
  generateRandomToken,
  signPayload,
  verifySignedPayload,
} from '../utils/crypto';
import {
  CSRF_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = env.NODE_ENV === 'production';

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
}

export function startGithubOAuth(_req: Request, res: Response): void {
  const state = generateRandomToken(24);
  const signedState = signPayload({ state, exp: Date.now() + 10 * 60 * 1000 });

  res.cookie(OAUTH_STATE_COOKIE_NAME, signedState, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
    scope: 'read:user user:email public_repo',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export async function handleGithubCallback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = callbackQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'Invalid OAuth callback query parameters', 'OAUTH_INVALID_QUERY');
    }

    const { code, state } = parsed.data;
    const rawStateCookie = req.cookies?.[OAUTH_STATE_COOKIE_NAME];
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      path: '/',
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });

    if (!rawStateCookie || typeof rawStateCookie !== 'string') {
      throw new AppError(400, 'Missing OAuth state cookie', 'OAUTH_STATE_MISMATCH');
    }

    const verifiedState = verifySignedPayload<{ state: string; exp: number }>(rawStateCookie);
    if (!verifiedState || verifiedState.exp < Date.now() || verifiedState.state !== state) {
      throw new AppError(400, 'OAuth state validation failed', 'OAUTH_STATE_MISMATCH');
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_OAUTH_CALLBACK_URL,
      }),
    });

    const tokenJson = (await tokenRes.json()) as GitHubTokenResponse;
    if (!tokenRes.ok || !tokenJson.access_token) {
      logger.warn({ err: tokenJson.error }, 'GitHub OAuth token exchange failed');
      throw new AppError(401, 'GitHub authorization failed', 'OAUTH_EXCHANGE_FAILED');
    }

    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoLens-App',
      },
    });

    if (!ghUserRes.ok) {
      throw new AppError(502, 'Failed to fetch GitHub user profile', 'GITHUB_API_ERROR');
    }

    const ghUser = (await ghUserRes.json()) as GitHubUserResponse;
    const encryptedAccessToken = encryptSecret(tokenJson.access_token);

    const user = await User.findOneAndUpdate(
      { githubId: String(ghUser.id) },
      {
        githubId: String(ghUser.id),
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        ...(ghUser.email ? { email: ghUser.email } : {}),
        encryptedAccessToken,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const sessionToken = signPayload({
      userId: String(user._id),
      exp: Date.now() + SESSION_MAX_AGE_MS,
    });
    const csrfToken = generateRandomToken(24);

    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });

    res.redirect(`${env.CLIENT_URL}/dashboard`);
  } catch (err) {
    next(err);
  }
}

export function logout(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.status(200).json({ ok: true });
}

export function getMe(req: Request, res: Response): void {
  const user = req.user!;
  res.json({
    id: String(user._id),
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    email: user.email ?? null,
    createdAt: user.createdAt.toISOString(),
  });
}