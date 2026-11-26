import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ConnectRepoBodySchema, type ConnectedRepo, type GitHubRepoItem } from '@repolens/shared';
import { Repo, type IRepo } from '../models/Repo';
import { Scan, type IScan } from '../models/Scan';
import { Finding } from '../models/Finding';
import { Summary } from '../models/Summary';
import { Chunk } from '../models/Chunk';
import { decryptSecret, encryptSecret, generateRandomToken } from '../utils/crypto';
import {
  createRepoWebhook,
  deleteRepoWebhook,
  getGitHubRepo,
  listUserGitHubRepos,
} from '../services/github/githubClient';
import { AppError } from '../middleware/errorHandler';

const repoIdParamSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid repository ID'),
});

function serializeRepo(repo: IRepo, latestScan?: IScan | null): ConnectedRepo {
  return {
    id: String(repo._id),
    githubRepoId: repo.githubRepoId,
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    webhookActive: typeof repo.webhookId === 'number',
    lastScannedSha: repo.lastScannedSha ?? null,
    securityScore: typeof repo.securityScore === 'number' ? repo.securityScore : null,
    lastScanAt: latestScan?.finishedAt
      ? latestScan.finishedAt.toISOString()
      : latestScan?.createdAt
        ? latestScan.createdAt.toISOString()
        : null,
    lastScanStatus: latestScan?.status ?? null,
    counts: latestScan?.counts ?? { critical: 0, high: 0, medium: 0, low: 0 },
    createdAt: repo.createdAt.toISOString(),
  };
}

export async function listAvailableGitHubRepos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const accessToken = decryptSecret(user.encryptedAccessToken);

    const [ghRepos, connectedRepos] = await Promise.all([
      listUserGitHubRepos(accessToken),
      Repo.find({ userId: user._id }).select('githubRepoId _id').lean(),
    ]);

    const connectedMap = new Map<string, string>(
      connectedRepos.map((r) => [r.githubRepoId, String(r._id)]),
    );

    const items: GitHubRepoItem[] = ghRepos.map((repo) => {
      const ghId = String(repo.id);
      const connectedId = connectedMap.get(ghId) ?? null;
      return {
        githubRepoId: ghId,
        fullName: repo.full_name,
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description,
        defaultBranch: repo.default_branch,
        isPrivate: repo.private,
        language: repo.language,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
        alreadyConnected: connectedId !== null,
        connectedRepoId: connectedId,
      };
    });

    res.json({ repos: items });
  } catch (err) {
    next(err);
  }
}

export async function connectRepo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { fullName } = ConnectRepoBodySchema.parse(req.body);
    const accessToken = decryptSecret(user.encryptedAccessToken);

    const ghRepo = await getGitHubRepo(accessToken, fullName);
    const githubRepoId = String(ghRepo.id);

    const existing = await Repo.findOne({ userId: user._id, githubRepoId });
    if (existing) {
      res.status(200).json({ repo: serializeRepo(existing) });
      return;
    }

    const webhookSecret = generateRandomToken(32);
    const encryptedWebhookSecret = encryptSecret(webhookSecret);
    const webhookId = await createRepoWebhook(accessToken, ghRepo.full_name, webhookSecret);

    const repo = await Repo.create({
      userId: user._id,
      githubRepoId,
      fullName: ghRepo.full_name,
      defaultBranch: ghRepo.default_branch,
      isPrivate: ghRepo.private,
      ...(webhookId ? { webhookId } : {}),
      encryptedWebhookSecret,
    });

    res.status(201).json({ repo: serializeRepo(repo) });
  } catch (err) {
    next(err);
  }
}

export async function listConnectedRepos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const repos = await Repo.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    const serialized = await Promise.all(
      repos.map(async (repo) => {
        const latestScan = await Scan.findOne({ repoId: repo._id }).sort({ createdAt: -1 });
        return serializeRepo(repo, latestScan);
      }),
    );
    res.json({ repos: serialized });
  } catch (err) {
    next(err);
  }
}

export async function getConnectedRepo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = repoIdParamSchema.parse(req.params);
    const repo = await Repo.findOne({ _id: id, userId: req.user!._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }
    const latestScan = await Scan.findOne({ repoId: repo._id }).sort({ createdAt: -1 });
    res.json({ repo: serializeRepo(repo, latestScan) });
  } catch (err) {
    next(err);
  }
}

export async function disconnectRepo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = repoIdParamSchema.parse(req.params);
    const repo = await Repo.findOne({ _id: id, userId: user._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const accessToken = decryptSecret(user.encryptedAccessToken);
    await deleteRepoWebhook(accessToken, repo.fullName, repo.webhookId);

    await Promise.all([
      Finding.deleteMany({ repoId: repo._id }),
      Scan.deleteMany({ repoId: repo._id }),
      Summary.deleteMany({ repoId: repo._id }),
      Chunk.deleteMany({ repoId: repo._id }),
      Repo.deleteOne({ _id: repo._id }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}