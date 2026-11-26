import type { SeverityCounts } from '@repolens/shared';
import { env } from '../config/env';
import { Repo } from '../models/Repo';
import { Scan } from '../models/Scan';
import { Finding } from '../models/Finding';
import { User } from '../models/User';
import { decryptSecret } from '../utils/crypto';
import { calculateSecurityScore } from '../utils/mask';
import { postPullRequestComment } from '../services/github/githubClient';
import { fetchRepoTextFiles } from '../services/github/repoFiles';
import { scanFileForSecrets, type RawFinding } from '../services/scanners/secretsScanner';
import { scanDependenciesWithOSV } from '../services/scanners/dependencyScanner';
import { scanFileForPatterns } from '../services/scanners/patternScanner';
import { generateCycloneDxSbom } from '../services/scanners/sbomGenerator';
import { scanRepositoryLicenses } from '../services/scanners/licenseScanner';
import { enrichCriticalAndHighFindings, type EnrichedFinding } from '../services/llm/findingExplainer';
import { emitToUser } from '../socket';
import { logger } from '../utils/logger';

export interface ScanJobData {
  scanId: string;
  repoId: string;
  userId: string;
  commitSha: string;
}

async function updateProgress(
  userId: string,
  repoId: string,
  scanId: string,
  progress: number,
  stage: string,
) {
  await Scan.updateOne({ _id: scanId }, { status: 'running', progress });
  emitToUser(userId, 'scan:progress', { scanId, repoId, progress, stage });
}

function formatPrSecurityComment(
  repoFullName: string,
  repoId: string,
  commitSha: string,
  securityScore: number,
  counts: SeverityCounts,
  findings: EnrichedFinding[],
): string {
  const topFindings = findings.slice(0, 5);
  const topSection =
    topFindings.length === 0
      ? 'No security issues were detected in this commit.'
      : [
        '### Top Findings',
        ...topFindings.map(
          (f) =>
            `- **[${f.severity.toUpperCase()}]** ${f.title} (\`${f.filePath}:${f.lineNumber}\`)`,
        ),
      ].join('\n');

  return [
    `## RepoLens Security Scan — \`${commitSha.slice(0, 7)}\``,
    '',
    `**Security Score:** \`${securityScore} / 100\``,
    '',
    '| Critical | High | Medium | Low |',
    '| :---: | :---: | :---: | :---: |',
    `| ${counts.critical} | ${counts.high} | ${counts.medium} | ${counts.low} |`,
    '',
    topSection,
    '',
    `[View full report in RepoLens](${env.CLIENT_URL}/repos/${repoId})`,
  ].join('\n');
}

async function processScanJob(data: ScanJobData): Promise<void> {
  const { scanId, repoId, userId, commitSha } = data;

  try {
    await Scan.updateOne(
      { _id: scanId },
      { status: 'running', progress: 10, startedAt: new Date() },
    );
    emitToUser(userId, 'scan:progress', {
      scanId,
      repoId,
      progress: 10,
      stage: 'Fetching repository files...',
    });

    const [repo, user, scanDoc] = await Promise.all([
      Repo.findById(repoId),
      User.findById(userId),
      Scan.findById(scanId),
    ]);
    if (!repo || !user || !scanDoc) {
      throw new Error('Repository, user, or scan no longer exists');
    }

    const accessToken = decryptSecret(user.encryptedAccessToken);
    const { files } = await fetchRepoTextFiles(accessToken, repo.fullName, commitSha);
    const nonLockFiles = files.filter((f) => !f.path.endsWith('package-lock.json'));

    await updateProgress(userId, repoId, scanId, 25, `Scanning ${nonLockFiles.length} files for secrets...`);
    const rawFindings: RawFinding[] = [];
    for (const file of nonLockFiles) {
      rawFindings.push(...scanFileForSecrets(file.path, file.content));
    }

    await updateProgress(userId, repoId, scanId, 50, 'Auditing dependencies via OSV.dev...');
    const depFindings = await scanDependenciesWithOSV(files);
    rawFindings.push(...depFindings);

    await updateProgress(userId, repoId, scanId, 75, 'Analyzing code patterns...');
    for (const file of nonLockFiles) {
      rawFindings.push(...scanFileForPatterns(file.path, file.content));
    }

    await updateProgress(userId, repoId, scanId, 90, 'Generating AI explanations and fixes...');
    const enrichedFindings = await enrichCriticalAndHighFindings(rawFindings, nonLockFiles);

    const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of enrichedFindings) {
      counts[f.severity] += 1;
    }
    const securityScore = calculateSecurityScore(counts);

    await Finding.deleteMany({ scanId });
    await updateProgress(userId, repoId, scanId, 85, 'Generating SBOM and analyzing license compliance...');
    const sbomData = generateCycloneDxSbom(repo.fullName, commitSha, files);
    const licenseData = scanRepositoryLicenses(files);

    // Security Regression Detection
    const prevScan = await Scan.findOne({
      repoId,
      status: 'completed',
      _id: { $ne: scanId },
    }).sort({ finishedAt: -1, createdAt: -1 });

    const previousScore = prevScan && typeof prevScan.securityScore === 'number' ? prevScan.securityScore : null;
    const scoreDelta = previousScore !== null ? securityScore - previousScore : null;
    const isRegression = scoreDelta !== null && scoreDelta < 0;

    let prevFindingKeys = new Set<string>();
    if (prevScan) {
      const prevFindings = await Finding.find({ scanId: prevScan._id }, { ruleId: 1, filePath: 1 });
      prevFindingKeys = new Set(prevFindings.map((f) => `${f.ruleId}:${f.filePath}`));
    }

    if (enrichedFindings.length > 0) {
      await Finding.insertMany(
        enrichedFindings.map((f) => ({
          scanId,
          repoId,
          type: f.type,
          severity: f.severity,
          title: f.title,
          filePath: f.filePath,
          lineNumber: f.lineNumber,
          maskedPreview: f.maskedPreview,
          ruleId: f.ruleId,
          description: f.description,
          ...(f.aiExplanation ? { aiExplanation: f.aiExplanation } : {}),
          ...(f.aiSuggestedFix ? { aiSuggestedFix: f.aiSuggestedFix } : {}),
          isRegressionNew: isRegression && !prevFindingKeys.has(`${f.ruleId}:${f.filePath}`),
          status: 'open',
        })),
      );
    }

    if (scanDoc.trigger === 'pull_request' && typeof scanDoc.prNumber === 'number') {
      const commentBody = formatPrSecurityComment(
        repo.fullName,
        repoId,
        commitSha,
        securityScore,
        counts,
        enrichedFindings,
      );
      await postPullRequestComment(accessToken, repo.fullName, scanDoc.prNumber, commentBody);
    }

    const finishedAt = new Date();
    await Scan.updateOne(
      { _id: scanId },
      {
        status: 'completed',
        progress: 100,
        finishedAt,
        counts,
        securityScore,
        scoreDelta,
        previousScore,
        isRegression,
        sbom: sbomData,
        licenses: licenseData,
      },
    );

    if (scanDoc.trigger !== 'pull_request') {
      await Repo.updateOne(
        { _id: repoId },
        {
          lastScannedSha: commitSha,
          securityScore,
        },
      );
    }

    emitToUser(userId, 'scan:completed', {
      scanId,
      repoId,
      commitSha,
      counts,
      securityScore,
      scoreDelta,
      previousScore,
      isRegression,
      finishedAt: finishedAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed unexpectedly';
    logger.error({ err, scanId, repoId }, 'Scan job failed');
    await Scan.updateOne(
      { _id: scanId },
      {
        status: 'failed',
        finishedAt: new Date(),
        error: message,
      },
    );
    emitToUser(userId, 'scan:failed', { scanId, repoId, error: message });
  }
}

/**
 * Pure MERN In-Process & MongoDB-backed Scan Queue
 * Replaces external Redis / BullMQ dependency with zero external overhead.
 */
class MongoScanQueue {
  private queue: ScanJobData[] = [];
  private activeWorkers = 0;
  private readonly concurrency = 3;

  async add(_name: string, data: ScanJobData): Promise<{ id: string }> {
    this.queue.push(data);
    this.processNext();
    return { id: data.scanId };
  }

  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const nextJob = this.queue.shift();
    if (!nextJob) return;

    this.activeWorkers++;
    try {
      await processScanJob(nextJob);
    } catch (err) {
      logger.error({ err, scanId: nextJob.scanId }, 'Scan job error in MongoScanQueue');
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  async recoverPendingJobs(): Promise<void> {
    try {
      const pendingScans = await Scan.find({ status: { $in: ['queued', 'running'] } })
        .sort({ createdAt: 1 })
        .limit(50);

      for (const scan of pendingScans) {
        const repo = await Repo.findById(scan.repoId);
        if (repo) {
          this.add('scan-repo', {
            scanId: String(scan._id),
            repoId: String(repo._id),
            userId: String(repo.userId),
            commitSha: scan.commitSha,
          });
        }
      }

      if (pendingScans.length > 0) {
        logger.info({ count: pendingScans.length }, 'Recovered pending scans from MongoDB');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to recover pending scans from MongoDB');
    }
  }
}

export const scanQueue = new MongoScanQueue();

export function startScanWorker(): void {
  logger.info('MongoDB-backed scan worker started (pure MERN stack)');
  void scanQueue.recoverPendingJobs();
}
