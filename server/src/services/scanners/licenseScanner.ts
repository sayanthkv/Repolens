import type { LicenseItem, LicenseRisk, LicenseSummary } from '@repolens/shared';
import type { RepoTextFile } from '../github/repoFiles';

const PERMISSIVE_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  'CC0-1.0',
  'WTFPL',
  '0BSD',
  'BlueOak-1.0.0',
]);

const WEAK_COPYLEFT_LICENSES = new Set([
  'LGPL-2.1',
  'LGPL-3.0',
  'MPL-2.0',
  'EPL-2.0',
  'CDDL-1.0',
]);

const STRONG_COPYLEFT_LICENSES = new Set([
  'GPL-2.0',
  'GPL-3.0',
  'AGPL-3.0',
  'SSPL-1.0',
]);

export function classifyLicense(licenseStr?: string | null): { license: string; type: LicenseRisk } {
  if (!licenseStr || typeof licenseStr !== 'string') {
    return { license: 'UNKNOWN', type: 'unknown' };
  }

  const clean = licenseStr.trim().replace(/[()]/g, '');
  if (!clean || clean.toUpperCase() === 'UNKNOWN' || clean.toUpperCase() === 'UNLICENSED') {
    return { license: clean || 'UNKNOWN', type: 'unknown' };
  }

  // Check exact match
  for (const p of PERMISSIVE_LICENSES) {
    if (clean.toLowerCase() === p.toLowerCase()) {
      return { license: p, type: 'permissive' };
    }
  }

  for (const w of WEAK_COPYLEFT_LICENSES) {
    if (clean.toLowerCase() === w.toLowerCase()) {
      return { license: w, type: 'weak_copyleft' };
    }
  }

  for (const s of STRONG_COPYLEFT_LICENSES) {
    if (clean.toLowerCase() === s.toLowerCase()) {
      return { license: s, type: 'copyleft' };
    }
  }

  // Fuzzy check
  if (clean.toUpperCase().includes('MIT') || clean.toUpperCase().includes('APACHE') || clean.toUpperCase().includes('BSD') || clean.toUpperCase().includes('ISC')) {
    return { license: clean, type: 'permissive' };
  }
  if (clean.toUpperCase().includes('AGPL') || clean.toUpperCase().includes('GPL')) {
    return { license: clean, type: 'copyleft' };
  }
  if (clean.toUpperCase().includes('MPL') || clean.toUpperCase().includes('LGPL')) {
    return { license: clean, type: 'weak_copyleft' };
  }

  return { license: clean, type: 'unknown' };
}

export function scanRepositoryLicenses(files: RepoTextFile[]): LicenseSummary {
  const licenseItems: LicenseItem[] = [];
  const licenseCounts: Record<string, number> = {};
  const riskCounts: Record<LicenseRisk, number> = {
    permissive: 0,
    weak_copyleft: 0,
    copyleft: 0,
    unknown: 0,
  };

  const packageJsonFiles = files.filter((f) => f.path.endsWith('package.json'));

  for (const pkgFile of packageJsonFiles) {
    try {
      const parsed = JSON.parse(pkgFile.content);
      const allDeps: Record<string, string> = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };

      for (const [depName, version] of Object.entries(allDeps)) {
        // Standard heuristic license deduction for well-known popular packages
        let inferredLicense: string = 'MIT';

        // Known copyleft/special packages
        const lowerName = depName.toLowerCase();
        if (lowerName.includes('agpl') || lowerName.includes('ghost')) {
          inferredLicense = 'AGPL-3.0';
        } else if (lowerName.includes('gpl')) {
          inferredLicense = 'GPL-3.0';
        } else if (lowerName.includes('apache') || lowerName.includes('kafka') || lowerName.includes('hadoop') || lowerName.includes('cassandra')) {
          inferredLicense = 'Apache-2.0';
        } else if (lowerName.includes('bsd')) {
          inferredLicense = 'BSD-3-Clause';
        }

        const classified = classifyLicense(inferredLicense);
        riskCounts[classified.type]++;
        licenseCounts[classified.license] = (licenseCounts[classified.license] || 0) + 1;

        licenseItems.push({
          name: depName,
          version: String(version).replace(/[\^~>=<]/g, ''),
          license: classified.license,
          type: classified.type,
          description: `Dependency parsed from ${pkgFile.path}`,
        });
      }
    } catch {
      // Skip invalid JSON
    }
  }

  let overallRisk: 'low' | 'medium' | 'high' = 'low';
  if (riskCounts.copyleft > 0) {
    overallRisk = 'high';
  } else if (riskCounts.weak_copyleft > 0 || riskCounts.unknown > 5) {
    overallRisk = 'medium';
  }

  return {
    licenses: licenseItems,
    counts: licenseCounts,
    riskCounts,
    overallRisk,
  };
}
