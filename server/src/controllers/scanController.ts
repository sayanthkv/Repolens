import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  UpdateFindingBodySchema,
  type FindingItem,
  type ScanSummaryItem,
  type SeverityCounts,
} from '@repolens/shared';
import { Repo } from '../models/Repo';
import { Scan, type IScan } from '../models/Scan';
import { Finding, type IFinding } from '../models/Finding';
import { decryptSecret } from '../utils/crypto';
import { calculateSecurityScore } from '../utils/mask';
import { getBranchHeadSha, fetchRepoTextFiles } from '../services/github/repoFiles';
import { createFixPullRequest } from '../services/github/githubClient';
import { generateCycloneDxSbom } from '../services/scanners/sbomGenerator';
import { scanRepositoryLicenses } from '../services/scanners/licenseScanner';
import { scanQueue } from '../queue/scanQueue';
import { AppError } from '../middleware/errorHandler';

const objectIdParam = z.object({
  id: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid ID'),
});

function serializeScan(scan: IScan): ScanSummaryItem {
  return {
    id: String(scan._id),
    repoId: String(scan.repoId),
    commitSha: scan.commitSha,
    trigger: scan.trigger,
    status: scan.status,
    progress: scan.progress,
    startedAt: scan.startedAt ? scan.startedAt.toISOString() : null,
    finishedAt: scan.finishedAt ? scan.finishedAt.toISOString() : null,
    counts: scan.counts,
    securityScore: typeof scan.securityScore === 'number' ? scan.securityScore : null,
    scoreDelta: typeof scan.scoreDelta === 'number' ? scan.scoreDelta : null,
    previousScore: typeof scan.previousScore === 'number' ? scan.previousScore : null,
    isRegression: Boolean(scan.isRegression),
    error: scan.error ?? null,
  };
}

function serializeFinding(f: IFinding): FindingItem {
  return {
    id: String(f._id),
    scanId: String(f.scanId),
    repoId: String(f.repoId),
    type: f.type,
    severity: f.severity,
    title: f.title,
    filePath: f.filePath,
    lineNumber: f.lineNumber,
    maskedPreview: f.maskedPreview,
    ruleId: f.ruleId,
    description: f.description,
    aiExplanation: f.aiExplanation ?? null,
    aiSuggestedFix: f.aiSuggestedFix ?? null,
    prUrl: f.prUrl ?? null,
    isRegressionNew: Boolean(f.isRegressionNew),
    status: f.status,
  };
}

export async function triggerRepoScan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = objectIdParam.parse(req.params);

    const repo = await Repo.findOne({ _id: id, userId: user._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const activeScan = await Scan.findOne({
      repoId: repo._id,
      status: { $in: ['queued', 'running'] },
    });
    if (activeScan) {
      res.status(200).json({ scan: serializeScan(activeScan) });
      return;
    }

    const accessToken = decryptSecret(user.encryptedAccessToken);
    const commitSha = await getBranchHeadSha(accessToken, repo.fullName, repo.defaultBranch);

    const scan = await Scan.create({
      repoId: repo._id,
      commitSha,
      trigger: 'manual',
      status: 'queued',
      progress: 0,
      counts: { critical: 0, high: 0, medium: 0, low: 0 },
    });

    await scanQueue.add('scan-repo', {
      scanId: String(scan._id),
      repoId: String(repo._id),
      userId: String(user._id),
      commitSha,
    });

    res.status(202).json({ scan: serializeScan(scan) });
  } catch (err) {
    next(err);
  }
}

export async function listRepoScans(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const repo = await Repo.findOne({ _id: id, userId: req.user!._id });
    if (!repo) {
      throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
    }

    const scans = await Scan.find({ repoId: repo._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ scans: scans.map(serializeScan) });
  } catch (err) {
    next(err);
  }
}

export async function getScanDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const scan = await Scan.findById(id);
    if (!scan) {
      throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');
    }

    const repo = await Repo.findOne({ _id: scan.repoId, userId: req.user!._id });
    if (!repo) {
      throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');
    }

    const findings = await Finding.find({ scanId: scan._id }).sort({ lineNumber: 1 });
    res.json({
      scan: serializeScan(scan),
      findings: findings.map(serializeFinding),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFindingStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const { status } = UpdateFindingBodySchema.parse(req.body);

    const finding = await Finding.findById(id);
    if (!finding) {
      throw new AppError(404, 'Finding not found', 'FINDING_NOT_FOUND');
    }

    const repo = await Repo.findOne({ _id: finding.repoId, userId: req.user!._id });
    if (!repo) {
      throw new AppError(404, 'Finding not found', 'FINDING_NOT_FOUND');
    }

    finding.status = status;
    await finding.save();

    // Recalculate open counts & score for the finding's scan
    const openFindings = await Finding.find({ scanId: finding.scanId, status: 'open' }).select(
      'severity',
    );
    const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const item of openFindings) {
      counts[item.severity] += 1;
    }
    const securityScore = calculateSecurityScore(counts);

    await Scan.updateOne({ _id: finding.scanId }, { counts, securityScore });

    const latestScan = await Scan.findOne({ repoId: repo._id, status: 'completed' }).sort({
      createdAt: -1,
    });
    if (latestScan && String(latestScan._id) === String(finding.scanId)) {
      repo.securityScore = securityScore;
      await repo.save();
    }

    res.json({
      finding: serializeFinding(finding),
      counts,
      securityScore,
    });
  } catch (err) {
    next(err);
  }
}

export async function getScanSbom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const scan = await Scan.findById(id);
    if (!scan) throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');

    const repo = await Repo.findOne({ _id: scan.repoId, userId: req.user!._id });
    if (!repo) throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');

    let sbom = scan.sbom;
    if (!sbom) {
      const accessToken = decryptSecret(req.user!.encryptedAccessToken);
      const { files } = await fetchRepoTextFiles(accessToken, repo.fullName, scan.commitSha);
      sbom = generateCycloneDxSbom(repo.fullName, scan.commitSha, files) as unknown as Record<string, unknown>;
      await Scan.updateOne({ _id: scan._id }, { sbom });
    }

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cyclonedx-sbom-${scan.commitSha.slice(0, 7)}.json"`,
      );
    }
    res.json(sbom);
  } catch (err) {
    next(err);
  }
}

export async function getScanLicenses(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const scan = await Scan.findById(id);
    if (!scan) throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');

    const repo = await Repo.findOne({ _id: scan.repoId, userId: req.user!._id });
    if (!repo) throw new AppError(404, 'Scan not found', 'SCAN_NOT_FOUND');

    let licenses = scan.licenses;
    if (!licenses) {
      const accessToken = decryptSecret(req.user!.encryptedAccessToken);
      const { files } = await fetchRepoTextFiles(accessToken, repo.fullName, scan.commitSha);
      licenses = scanRepositoryLicenses(files);
      await Scan.updateOne({ _id: scan._id }, { licenses });
    }

    res.json(licenses);
  } catch (err) {
    next(err);
  }
}

export async function createFindingFixPr(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = objectIdParam.parse(req.params);
    const finding = await Finding.findById(id);
    if (!finding) throw new AppError(404, 'Finding not found', 'FINDING_NOT_FOUND');

    const repo = await Repo.findOne({ _id: finding.repoId, userId: req.user!._id });
    if (!repo) throw new AppError(404, 'Finding not found', 'FINDING_NOT_FOUND');

    if (!finding.aiSuggestedFix) {
      throw new AppError(400, 'No AI suggested fix available for this finding', 'NO_FIX_AVAILABLE');
    }

    const accessToken = decryptSecret(req.user!.encryptedAccessToken);
    const prResult = await createFixPullRequest({
      accessToken,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      filePath: finding.filePath,
      findingTitle: finding.title,
      vulnerableSnippet: finding.maskedPreview,
      safeReplacement: finding.aiSuggestedFix,
      aiExplanation: finding.aiExplanation,
    });

    finding.prUrl = prResult.prUrl;
    await finding.save();

    res.json({
      success: true,
      prUrl: prResult.prUrl,
      prNumber: prResult.prNumber,
      branchName: prResult.branchName,
    });
  } catch (err) {
    next(err);
  }
}