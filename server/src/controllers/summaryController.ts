import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { RepoSummaryRecord } from '@repolens/shared';
import { Repo } from '../models/Repo';
import { Summary, type ISummary } from '../models/Summary';
import { decryptSecret } from '../utils/crypto';
import { fetchRepoTextFiles, getBranchHeadSha } from '../services/github/repoFiles';
import { generateRepoSummary } from '../services/summarizer/repoSummarizer';
import { AppError } from '../middleware/errorHandler';

const repoIdParam = z.object({
  id: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid repository ID'),
});

function serializeSummary(doc: ISummary): RepoSummaryRecord {
  return {
    id: String(doc._id),
    repoId: String(doc.repoId),
    commitSha: doc.commitSha,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function getLatestRepoSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = repoIdParam.parse(req.params);
    const repo = await Repo.findOne({ _id: id, userId: req.user!._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const summary = await Summary.findOne({ repoId: repo._id }).sort({ createdAt: -1 });
    res.json({ summary: summary ? serializeSummary(summary) : null });
  } catch (err) {
    next(err);
  }
}

export async function createOrFetchRepoSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = repoIdParam.parse(req.params);
    const force = req.query.force === 'true' || req.body?.force === true;

    const repo = await Repo.findOne({ _id: id, userId: user._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const accessToken = decryptSecret(user.encryptedAccessToken);
    const commitSha = await getBranchHeadSha(accessToken, repo.fullName, repo.defaultBranch);

    if (!force) {
      const cached = await Summary.findOne({ repoId: repo._id, commitSha });
      if (cached) {
        res.status(200).json({ summary: serializeSummary(cached), cached: true });
        return;
      }
    }

    const { files } = await fetchRepoTextFiles(accessToken, repo.fullName, commitSha);
    const content = await generateRepoSummary(repo.fullName, files);

    const saved = await Summary.findOneAndUpdate(
      { repoId: repo._id, commitSha },
      { repoId: repo._id, commitSha, content },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({ summary: serializeSummary(saved), cached: false });
  } catch (err) {
    next(err);
  }
}