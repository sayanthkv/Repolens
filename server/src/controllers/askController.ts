import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AskRepoBodySchema } from '@repolens/shared';
import { Repo } from '../models/Repo';
import { decryptSecret } from '../utils/crypto';
import { getBranchHeadSha } from '../services/github/repoFiles';
import {
  ensureRepoIndexedForCommit,
  retrieveRelevantChunks,
  streamRepoAnswer,
} from '../services/rag/repoChat';
import { AppError } from '../middleware/errorHandler';

const repoIdParam = z.object({
  id: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid repository ID'),
});

function writeSseEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function askRepositoryQuestion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = repoIdParam.parse(req.params);
    const { question, history } = AskRepoBodySchema.parse(req.body);

    const repo = await Repo.findOne({ _id: id, userId: user._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const accessToken = decryptSecret(user.encryptedAccessToken);
    const commitSha = await getBranchHeadSha(accessToken, repo.fullName, repo.defaultBranch);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    writeSseEvent(res, 'status', { stage: 'Indexing repository chunks...' });
    await ensureRepoIndexedForCommit(repo._id, commitSha, accessToken, repo.fullName);

    writeSseEvent(res, 'status', { stage: 'Retrieving relevant files...' });
    const chunks = await retrieveRelevantChunks(repo._id, commitSha, question);

    const citations = chunks.map((c) => ({
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
    }));
    writeSseEvent(res, 'citations', { commitSha, citations });

    await streamRepoAnswer(
      {
        repoFullName: repo.fullName,
        commitSha,
        question,
        history,
        chunks,
      },
      (delta) => {
        writeSseEvent(res, 'delta', { text: delta });
      },
    );

    writeSseEvent(res, 'done', { ok: true });
    res.end();
  } catch (err) {
    if (res.headersSent) {
      const message = err instanceof Error ? err.message : 'Failed to answer question';
      writeSseEvent(res, 'error', { message });
      res.end();
      return;
    }
    next(err);
  }
}