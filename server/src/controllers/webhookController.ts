import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Repo } from '../models/Repo';
import { Scan } from '../models/Scan';
import { decryptSecret } from '../utils/crypto';
import { verifyGitHubSignature } from '../utils/webhookVerify';
import { scanQueue } from '../queue/scanQueue';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const baseWebhookSchema = z.object({
  repository: z.object({
    id: z.number(),
    full_name: z.string(),
  }),
});

const pushPayloadSchema = baseWebhookSchema.extend({
  ref: z.string(),
  after: z.string(),
  deleted: z.boolean().optional(),
});

const pullRequestPayloadSchema = baseWebhookSchema.extend({
  action: z.string(),
  number: z.number().int().positive(),
  pull_request: z.object({
    head: z.object({
      sha: z.string().min(7),
    }),
  }),
});

export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const event = req.get('X-GitHub-Event');
    const signature = req.get('X-Hub-Signature-256');

    if (!event) {
      throw new AppError(400, 'Missing X-GitHub-Event header', 'WEBHOOK_MISSING_EVENT');
    }

    const baseParsed = baseWebhookSchema.safeParse(req.body);
    if (!baseParsed.success) {
      throw new AppError(400, 'Invalid webhook repository payload', 'WEBHOOK_INVALID_PAYLOAD');
    }

    const githubRepoId = String(baseParsed.data.repository.id);
    const repo = await Repo.findOne({ githubRepoId });
    if (!repo) {
      throw new AppError(404, 'Repository is not connected to RepoLens', 'REPO_NOT_CONNECTED');
    }

    const webhookSecret = decryptSecret(repo.encryptedWebhookSecret);
    const isValid = verifyGitHubSignature(req.rawBody, signature, webhookSecret);
    if (!isValid) {
      logger.warn({ githubRepoId, event }, 'Rejected GitHub webhook with invalid signature');
      throw new AppError(401, 'Invalid webhook signature', 'WEBHOOK_INVALID_SIGNATURE');
    }

    if (event === 'ping') {
      res.status(200).json({ ok: true, message: 'pong' });
      return;
    }

    if (event === 'push') {
      const push = pushPayloadSchema.parse(req.body);
      const expectedRef = `refs/heads/${repo.defaultBranch}`;
      if (push.deleted || push.ref !== expectedRef || /^0+$/.test(push.after)) {
        res.status(200).json({ ok: true, ignored: true, reason: 'Non-default branch or branch deletion' });
        return;
      }

      const scan = await Scan.create({
        repoId: repo._id,
        commitSha: push.after,
        trigger: 'push',
        status: 'queued',
        progress: 0,
        counts: { critical: 0, high: 0, medium: 0, low: 0 },
      });

      await scanQueue.add('scan-repo', {
        scanId: String(scan._id),
        repoId: String(repo._id),
        userId: String(repo.userId),
        commitSha: push.after,
      });

      res.status(202).json({ ok: true, scanId: String(scan._id) });
      return;
    }

    if (event === 'pull_request') {
      const pr = pullRequestPayloadSchema.parse(req.body);
      if (!['opened', 'reopened', 'synchronize'].includes(pr.action)) {
        res.status(200).json({ ok: true, ignored: true, reason: `Ignored PR action ${pr.action}` });
        return;
      }

      const commitSha = pr.pull_request.head.sha;
      const scan = await Scan.create({
        repoId: repo._id,
        commitSha,
        trigger: 'pull_request',
        prNumber: pr.number,
        status: 'queued',
        progress: 0,
        counts: { critical: 0, high: 0, medium: 0, low: 0 },
      });

      await scanQueue.add('scan-repo', {
        scanId: String(scan._id),
        repoId: String(repo._id),
        userId: String(repo.userId),
        commitSha,
      });

      res.status(202).json({ ok: true, scanId: String(scan._id) });
      return;
    }

    res.status(200).json({ ok: true, ignored: true, reason: `Unhandled event ${event}` });
  } catch (err) {
    next(err);
  }
}