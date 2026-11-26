import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { User } from '../models/User';
import { Repo } from '../models/Repo';
import { Scan } from '../models/Scan';
import { Finding } from '../models/Finding';
import { Summary } from '../models/Summary';
import { Chunk } from '../models/Chunk';
import { decryptSecret } from '../utils/crypto';
import { deleteRepoWebhook } from '../services/github/githubClient';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../middleware/auth';

export async function getAccountSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const connectedReposCount = await Repo.countDocuments({ userId: user._id });

    res.json({
      profile: {
        id: String(user._id),
        githubId: user.githubId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        email: user.email ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      oauthScopes: ['read:user', 'user:email', 'repo'],
      llm: {
        provider: env.LLM_PROVIDER,
        model: env.LLM_MODEL,
        configured:
          Boolean(env.LLM_API_KEY) &&
          env.LLM_API_KEY !== 'your_llm_api_key' &&
          !env.LLM_API_KEY.startsWith('replace_with'),
      },
      connectedReposCount,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccountAndData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const repos = await Repo.find({ userId: user._id });
    const repoIds = repos.map((r) => r._id);

    let accessToken: string | null = null;
    try {
      accessToken = decryptSecret(user.encryptedAccessToken);
    } catch {
      accessToken = null;
    }

    if (accessToken) {
      await Promise.all(
        repos.map((r) => deleteRepoWebhook(accessToken!, r.fullName, r.webhookId)),
      );
    }

    await Promise.all([
      Finding.deleteMany({ repoId: { $in: repoIds } }),
      Scan.deleteMany({ repoId: { $in: repoIds } }),
      Summary.deleteMany({ repoId: { $in: repoIds } }),
      Chunk.deleteMany({ repoId: { $in: repoIds } }),
      Repo.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);

    const isProd = env.NODE_ENV === 'production';
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
      httpOnly: false,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}