import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

interface ETagCacheEntry {
  etag: string;
  data: unknown;
}

const etagCache = new Map<string, ETagCacheEntry>();
const MAX_ETAG_ENTRIES = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  language: string | null;
  updated_at: string;
  html_url: string;
  owner: { login: string };
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

export async function githubRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {},
  attempt = 1,
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${accessToken.slice(-8)}:${url}`;

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  headers.set('User-Agent', 'RepoLens-App');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const cached = method === 'GET' ? etagCache.get(cacheKey) : undefined;
  if (cached) {
    headers.set('If-None-Match', cached.etag);
  }

  const response = await fetch(url, { ...options, method, headers });

  if (response.status === 304 && cached) {
    return cached.data as T;
  }

  const remaining = Number(response.headers.get('x-ratelimit-remaining') ?? '100');
  const resetEpoch = Number(response.headers.get('x-ratelimit-reset') ?? '0');

  if ((response.status === 403 || response.status === 429) && remaining === 0 && attempt <= 2) {
    const waitMs = Math.min(Math.max(resetEpoch * 1000 - Date.now(), 1000), 10_000);
    logger.warn({ waitMs, endpoint }, 'GitHub rate limit reached, backing off');
    await sleep(waitMs);
    return githubRequest<T>(accessToken, endpoint, options, attempt + 1);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    logger.warn({ status: response.status, endpoint, errText: errText.slice(0, 200) }, 'GitHub API error');
    if (response.status === 401) {
      throw new AppError(401, 'GitHub access token expired or revoked. Please log in again.', 'GITHUB_UNAUTHORIZED');
    }
    if (response.status === 404) {
      throw new AppError(404, 'GitHub repository or resource not found', 'GITHUB_NOT_FOUND');
    }
    throw new AppError(502, `GitHub API returned status ${response.status}`, 'GITHUB_API_ERROR');
  }

  const data = (await response.json()) as T;

  const etag = response.headers.get('etag');
  if (method === 'GET' && etag) {
    if (etagCache.size >= MAX_ETAG_ENTRIES) {
      const oldestKey = etagCache.keys().next().value;
      if (oldestKey) etagCache.delete(oldestKey);
    }
    etagCache.set(cacheKey, { etag, data });
  }

  return data;
}

export async function listUserGitHubRepos(accessToken: string): Promise<GitHubApiRepo[]> {
  return githubRequest<GitHubApiRepo[]>(
    accessToken,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator',
  );
}

export async function getGitHubRepo(accessToken: string, fullName: string): Promise<GitHubApiRepo> {
  return githubRequest<GitHubApiRepo>(accessToken, `/repos/${fullName}`);
}

export function isPublicWebhookUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export async function createRepoWebhook(
  accessToken: string,
  fullName: string,
  webhookSecret: string,
): Promise<number | undefined> {
  if (!isPublicWebhookUrl(env.WEBHOOK_BASE_URL)) {
    logger.info(
      { fullName, webhookBaseUrl: env.WEBHOOK_BASE_URL },
      'Skipping GitHub webhook registration because WEBHOOK_BASE_URL is local',
    );
    return undefined;
  }

  try {
    const hook = await githubRequest<{ id: number }>(accessToken, `/repos/${fullName}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request'],
        config: {
          url: `${env.WEBHOOK_BASE_URL.replace(/\/$/, '')}/api/webhooks/github`,
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    });
    return hook.id;
  } catch (err) {
    logger.warn({ err, fullName }, 'Unable to create GitHub webhook (requires admin permission)');
    return undefined;
  }
}

export async function deleteRepoWebhook(
  accessToken: string,
  fullName: string,
  webhookId?: number,
): Promise<void> {
  if (!webhookId) return;
  try {
    await githubRequest<void>(accessToken, `/repos/${fullName}/hooks/${webhookId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    logger.warn({ err, fullName, webhookId }, 'Failed to remove GitHub webhook during disconnect');
  }
}

export async function postPullRequestComment(
  accessToken: string,
  fullName: string,
  prNumber: number,
  body: string,
): Promise<void> {
  try {
    await githubRequest<unknown>(
      accessToken,
      `/repos/${fullName}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
    );
  } catch (err) {
    logger.warn({ err, fullName, prNumber }, 'Failed to post PR security summary comment');
  }
}

export interface CreateFixPrOptions {
  accessToken: string;
  fullName: string;
  defaultBranch: string;
  filePath: string;
  findingTitle: string;
  vulnerableSnippet: string;
  safeReplacement: string;
  aiExplanation?: string;
}

export async function createFixPullRequest(
  options: CreateFixPrOptions,
): Promise<{ prUrl: string; prNumber: number; branchName: string }> {
  const {
    accessToken,
    fullName,
    defaultBranch,
    filePath,
    findingTitle,
    vulnerableSnippet,
    safeReplacement,
    aiExplanation,
  } = options;

  // 1. Get base branch SHA
  const baseRef = await githubRequest<{ object: { sha: string } }>(
    accessToken,
    `/repos/${fullName}/git/ref/heads/${defaultBranch}`,
  );
  const baseSha = baseRef.object.sha;

  // 2. Create new branch
  const branchName = `repolens/fix-${Date.now().toString(36)}`;
  await githubRequest<unknown>(accessToken, `/repos/${fullName}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    }),
  });

  // 3. Get existing file content
  const fileData = await githubRequest<{ sha: string; content: string; encoding: string }>(
    accessToken,
    `/repos/${fullName}/contents/${filePath}?ref=${branchName}`,
  );

  const originalContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  let updatedContent = originalContent;

  const target = vulnerableSnippet.trim();
  const replacement = safeReplacement.trim();

  if (filePath.endsWith('package.json')) {
    try {
      const pkg = JSON.parse(originalContent) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      // Extract dependency name (e.g. vitest from "Vulnerable dependency: vitest@3.2.7")
      const nameMatch =
        findingTitle.match(/Vulnerable dependency:\s*(@?[a-zA-Z0-9._/-]+)@/i) ||
        target.match(/"(@?[a-zA-Z0-9._/-]+)"/) ||
        replacement.match(/"(@?[a-zA-Z0-9._/-]+)"/);
      const depName = nameMatch ? nameMatch[1] : null;

      // Extract fixed version (e.g. 3.2.8)
      const versionMatch =
        target.match(/Upgrade to\s+([0-9A-Za-z.-]+)/i) ||
        replacement.match(/([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)/);
      const fixedVersion = versionMatch ? versionMatch[1] : null;

      if (depName && fixedVersion) {
        if (pkg.devDependencies && pkg.devDependencies[depName]) {
          const prefix = pkg.devDependencies[depName].startsWith('^')
            ? '^'
            : pkg.devDependencies[depName].startsWith('~')
              ? '~'
              : '';
          pkg.devDependencies[depName] = `${prefix}${fixedVersion}`;
        } else if (pkg.dependencies && pkg.dependencies[depName]) {
          const prefix = pkg.dependencies[depName].startsWith('^')
            ? '^'
            : pkg.dependencies[depName].startsWith('~')
              ? '~'
              : '';
          pkg.dependencies[depName] = `${prefix}${fixedVersion}`;
        }
        updatedContent = JSON.stringify(pkg, null, 2) + '\n';
      } else {
        // Fallback for package.json: line replacement without adding invalid comments
        const lines = originalContent.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (depName && line && line.includes(`"${depName}"`)) {
            if (fixedVersion) {
              lines[i] = line.replace(/: "[^"]+"/, `: "^${fixedVersion}"`);
            }
            break;
          }
        }
        updatedContent = lines.join('\n');
      }
    } catch {
      // If parsing failed, fallback to clean replacement
      if (target && updatedContent.includes(target)) {
        updatedContent = updatedContent.replace(target, replacement);
      }
    }
  } else if (target && updatedContent.includes(target)) {
    updatedContent = updatedContent.replace(target, replacement);
  } else {
    // Code file line-based replacement
    const lines = updatedContent.split('\n');
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(target.slice(0, 30))) {
        lines[i] = replacement;
        replaced = true;
        break;
      }
    }
    if (replaced) {
      updatedContent = lines.join('\n');
    }
  }

  // 4. Commit updated file to branch
  await githubRequest<unknown>(accessToken, `/repos/${fullName}/contents/${filePath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `fix(security): resolve ${findingTitle}`,
      content: Buffer.from(updatedContent, 'utf8').toString('base64'),
      sha: fileData.sha,
      branch: branchName,
    }),
  });

  // 5. Create Pull Request
  const prBody = [
    `## 🛡️ RepoLens Security Remediation`,
    '',
    `### Finding: ${findingTitle}`,
    `**File:** \`${filePath}\``,
    '',
    `### Risk Explanation`,
    aiExplanation || 'Automated remediation generated by RepoLens security scanner.',
    '',
    `### Changes Applied`,
    '```diff',
    `- ${target}`,
    `+ ${replacement}`,
    '```',
    '',
    `---`,
    `*Automated fix created with [RepoLens](${env.CLIENT_URL})*`,
  ].join('\n');

  const pr = await githubRequest<{ html_url: string; number: number }>(
    accessToken,
    `/repos/${fullName}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `fix(security): resolve ${findingTitle}`,
        head: branchName,
        base: defaultBranch,
        body: prBody,
      }),
    },
  );

  return {
    prUrl: pr.html_url,
    prNumber: pr.number,
    branchName,
  };
}