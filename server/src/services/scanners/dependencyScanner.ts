import type { Severity } from '@repolens/shared';
import type { RawFinding } from './secretsScanner';
import type { RepoTextFile } from '../github/repoFiles';
import { logger } from '../../utils/logger';

interface ParsedDependency {
  name: string;
  version: string;
  filePath: string;
  lineNumber: number;
}

interface OsvQueryBatchResponse {
  results?: Array<{
    vulns?: Array<{
      id: string;
      summary?: string;
      details?: string;
      severity?: Array<{ type: string; score: string }>;
      database_specific?: { severity?: string };
      affected?: Array<{
        ranges?: Array<{
          events?: Array<{ introduced?: string; fixed?: string }>;
        }>;
      }>;
    }>;
  }>;
}

interface CachedOsvResult {
  vulns?: NonNullable<OsvQueryBatchResponse['results']>[number]['vulns'];
  timestamp: number;
}

const osvCache = new Map<string, CachedOsvResult>();
const OSV_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const MAX_OSV_CACHE_ENTRIES = 1000;

function cleanSemver(raw: string): string | null {
  const cleaned = raw.trim().replace(/^[\^~>=<v\s]+/, '');
  if (!cleaned || cleaned === '*' || cleaned.startsWith('workspace:') || cleaned.startsWith('file:')) {
    return null;
  }
  const match = cleaned.match(/^(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/);
  return match?.[1] ?? null;
}

function mapOsvSeverity(vuln: NonNullable<NonNullable<OsvQueryBatchResponse['results']>[number]['vulns']>[number]): Severity {
  const dbSev = vuln.database_specific?.severity?.toUpperCase();
  if (dbSev === 'CRITICAL') return 'critical';
  if (dbSev === 'HIGH') return 'high';
  if (dbSev === 'MODERATE' || dbSev === 'MEDIUM') return 'medium';
  if (dbSev === 'LOW') return 'low';

  const cvssEntry = vuln.severity?.[0]?.score;
  if (cvssEntry) {
    const numeric = Number(cvssEntry);
    if (!Number.isNaN(numeric)) {
      if (numeric >= 9.0) return 'critical';
      if (numeric >= 7.0) return 'high';
      if (numeric >= 4.0) return 'medium';
      return 'low';
    }
  }
  return 'high';
}

function extractFixedVersion(
  vuln: NonNullable<NonNullable<OsvQueryBatchResponse['results']>[number]['vulns']>[number],
): string | null {
  for (const aff of vuln.affected ?? []) {
    for (const range of aff.ranges ?? []) {
      for (const ev of range.events ?? []) {
        if (ev.fixed) return ev.fixed;
      }
    }
  }
  return null;
}

export function extractDependenciesFromFiles(files: RepoTextFile[]): ParsedDependency[] {
  const deps: ParsedDependency[] = [];
  const lockVersions = new Map<string, string>();

  // Optional exact versions from package-lock.json if present
  for (const file of files) {
    if (file.path.endsWith('package-lock.json')) {
      try {
        const parsed = JSON.parse(file.content) as {
          packages?: Record<string, { version?: string }>;
          dependencies?: Record<string, { version?: string }>;
        };
        if (parsed.packages) {
          for (const [pkgPath, meta] of Object.entries(parsed.packages)) {
            const name = pkgPath.replace(/^node_modules\//, '');
            if (name && meta.version) lockVersions.set(name, meta.version);
          }
        } else if (parsed.dependencies) {
          for (const [name, meta] of Object.entries(parsed.dependencies)) {
            if (meta.version) lockVersions.set(name, meta.version);
          }
        }
      } catch {
        // ignore malformed lockfile
      }
    }
  }

  for (const file of files) {
    if (!file.path.endsWith('package.json')) continue;
    try {
      const pkg = JSON.parse(file.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const lines = file.content.split(/\r?\n/);
      const combined = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };

      for (const [name, rawRange] of Object.entries(combined)) {
        const version = lockVersions.get(name) ?? cleanSemver(rawRange);
        if (!version) continue;

        const lineIdx = lines.findIndex((l) => l.includes(`"${name}"`));
        deps.push({
          name,
          version,
          filePath: file.path,
          lineNumber: lineIdx >= 0 ? lineIdx + 1 : 1,
        });
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return deps;
}

export async function scanDependenciesWithOSV(files: RepoTextFile[]): Promise<RawFinding[]> {
  const deps = extractDependenciesFromFiles(files);
  if (deps.length === 0) return [];

  const findings: RawFinding[] = [];
  const uncachedDeps: ParsedDependency[] = [];
  const now = Date.now();

  // 1. Process cached OSV results first
  for (const dep of deps) {
    const key = `${dep.name}@${dep.version}`;
    const cached = osvCache.get(key);
    if (cached && now - cached.timestamp < OSV_CACHE_TTL_MS) {
      if (cached.vulns && cached.vulns.length > 0) {
        for (const vuln of cached.vulns.slice(0, 3)) {
          const fixed = extractFixedVersion(vuln);
          const severity = mapOsvSeverity(vuln);
          findings.push({
            type: 'dependency',
            severity,
            title: `Vulnerable dependency: ${dep.name}@${dep.version} (${vuln.id})`,
            filePath: dep.filePath,
            lineNumber: dep.lineNumber,
            maskedPreview: fixed
              ? `"${dep.name}": "${dep.version}" -> Upgrade to ${fixed}`
              : `"${dep.name}": "${dep.version}" (${vuln.id})`,
            ruleId: `DEP-${vuln.id}`,
            description:
              vuln.summary ??
              vuln.details?.slice(0, 260) ??
              `Known security advisory ${vuln.id} affects ${dep.name} version ${dep.version}.`,
          });
        }
      }
    } else {
      uncachedDeps.push(dep);
    }
  }

  if (uncachedDeps.length === 0) {
    return findings;
  }

  const BATCH_SIZE = 100;

  for (let i = 0; i < uncachedDeps.length; i += BATCH_SIZE) {
    const batch = uncachedDeps.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch('https://api.osv.dev/v1/querybatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: batch.map((d) => ({
            package: { name: d.name, ecosystem: 'npm' },
            version: d.version,
          })),
        }),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, 'OSV batch query returned non-200 status');
        continue;
      }

      const data = (await res.json()) as OsvQueryBatchResponse;
      const results = data.results ?? [];

      results.forEach((entry, idx) => {
        const dep = batch[idx];
        if (!dep) return;

        const key = `${dep.name}@${dep.version}`;
        if (osvCache.size >= MAX_OSV_CACHE_ENTRIES) {
          const oldestKey = osvCache.keys().next().value;
          if (oldestKey) osvCache.delete(oldestKey);
        }
        osvCache.set(key, { vulns: entry.vulns, timestamp: Date.now() });

        if (!entry.vulns || entry.vulns.length === 0) return;

        for (const vuln of entry.vulns.slice(0, 3)) {
          const fixed = extractFixedVersion(vuln);
          const severity = mapOsvSeverity(vuln);
          findings.push({
            type: 'dependency',
            severity,
            title: `Vulnerable dependency: ${dep.name}@${dep.version} (${vuln.id})`,
            filePath: dep.filePath,
            lineNumber: dep.lineNumber,
            maskedPreview: fixed
              ? `"${dep.name}": "${dep.version}" -> Upgrade to ${fixed}`
              : `"${dep.name}": "${dep.version}" (${vuln.id})`,
            ruleId: `DEP-${vuln.id}`,
            description:
              vuln.summary ??
              vuln.details?.slice(0, 260) ??
              `Known security advisory ${vuln.id} affects ${dep.name} version ${dep.version}.`,
          });
        }
      });
    } catch (err) {
      logger.warn({ err }, 'OSV dependency check failed');
    }
  }

  return findings;
}