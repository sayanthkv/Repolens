import { githubRequest } from './githubClient';

export interface RepoTextFile {
  path: string;
  content: string;
  size: number;
}

interface GitBranchResponse {
  commit: {
    sha: string;
  };
}

interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
}

interface GitTreeResponse {
  sha: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

interface GitBlobResponse {
  content: string;
  encoding: string;
}

const MAX_FILE_SIZE_BYTES = 500 * 1024;
const MAX_FILES_PER_SCAN = 1500;

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
]);

const IGNORED_FILES = new Set([
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'Cargo.lock',
  'poetry.lock',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.bmp', '.avif',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.jar', '.war',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.sqlite', '.db', '.pyc', '.class', '.o', '.a',
]);

export function shouldSkipRepoPath(filePath: string, size?: number): boolean {
  if (typeof size === 'number' && size > MAX_FILE_SIZE_BYTES) {
    return true;
  }

  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';

  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i];
    if (segment && IGNORED_DIRS.has(segment)) {
      return true;
    }
  }

  if (IGNORED_FILES.has(fileName)) {
    return true;
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith('.min.js') || lower.endsWith('.min.css') || lower.endsWith('.map')) {
    return true;
  }

  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = lower.slice(dotIdx);
    if (BINARY_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  return false;
}

export async function getBranchHeadSha(
  accessToken: string,
  fullName: string,
  branch: string,
): Promise<string> {
  const data = await githubRequest<GitBranchResponse>(
    accessToken,
    `/repos/${fullName}/branches/${encodeURIComponent(branch)}`,
  );
  return data.commit.sha;
}

export async function fetchRepoTextFiles(
  accessToken: string,
  fullName: string,
  commitSha: string,
): Promise<{ files: RepoTextFile[]; truncated: boolean }> {
  const treeRes = await githubRequest<GitTreeResponse>(
    accessToken,
    `/repos/${fullName}/git/trees/${commitSha}?recursive=1`,
  );

  const candidateBlobs = treeRes.tree
    .filter((item) => item.type === 'blob' && !shouldSkipRepoPath(item.path, item.size))
    .slice(0, MAX_FILES_PER_SCAN);

  const files: RepoTextFile[] = [];
  const BATCH_SIZE = 15;

  for (let i = 0; i < candidateBlobs.length; i += BATCH_SIZE) {
    const batch = candidateBlobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (blob) => {
        try {
          const blobRes = await githubRequest<GitBlobResponse>(
            accessToken,
            `/repos/${fullName}/git/blobs/${blob.sha}`,
          );
          if (blobRes.encoding !== 'base64' || !blobRes.content) return null;
          const buffer = Buffer.from(blobRes.content, 'base64');
          if (buffer.includes(0)) return null;
          return {
            path: blob.path,
            content: buffer.toString('utf8'),
            size: buffer.length,
          } satisfies RepoTextFile;
        } catch {
          return null;
        }
      }),
    );

    for (const file of results) {
      if (file) files.push(file);
    }
  }

  return {
    files,
    truncated: treeRes.truncated || treeRes.tree.length > MAX_FILES_PER_SCAN,
  };
}