import { describe, it, expect } from 'vitest';
import { generateCycloneDxSbom } from '../services/scanners/sbomGenerator';
import { scanRepositoryLicenses, classifyLicense } from '../services/scanners/licenseScanner';
import type { RepoTextFile } from '../services/github/repoFiles';

describe('SBOM & License Compliance Engine', () => {
  const mockFiles: RepoTextFile[] = [
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'test-app',
        dependencies: {
          express: '^4.18.2',
          lodash: '~4.17.21',
          'gpl-library': '^1.0.0',
        },
        devDependencies: {
          vitest: '^2.0.0',
        },
      }),
      size: 150,
    },
  ];

  it('generates a valid CycloneDX v1.5 SBOM from dependencies', () => {
    const sbom = generateCycloneDxSbom('octocat/Hello-World', 'a1b2c3d4e5f6', mockFiles);

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]+$/);
    expect(sbom.metadata.component.name).toBe('octocat/Hello-World');
    expect(sbom.metadata.component.version).toBe('a1b2c3d');

    const componentNames = sbom.components.map((c) => c.name);
    expect(componentNames).toContain('express');
    expect(componentNames).toContain('lodash');
    expect(componentNames).toContain('vitest');

    const expressComp = sbom.components.find((c) => c.name === 'express');
    expect(expressComp?.purl).toBe('pkg:npm/express@4.18.2');
  });

  it('accurately classifies permissive and copyleft licenses', () => {
    expect(classifyLicense('MIT').type).toBe('permissive');
    expect(classifyLicense('Apache-2.0').type).toBe('permissive');
    expect(classifyLicense('BSD-3-Clause').type).toBe('permissive');
    expect(classifyLicense('GPL-3.0').type).toBe('copyleft');
    expect(classifyLicense('AGPL-3.0').type).toBe('copyleft');
    expect(classifyLicense('LGPL-3.0').type).toBe('weak_copyleft');
    expect(classifyLicense('UNKNOWN').type).toBe('unknown');
  });

  it('scans repository licenses and flags compliance risks', () => {
    const summary = scanRepositoryLicenses(mockFiles);

    expect(summary.licenses.length).toBe(4);
    expect(summary.riskCounts.copyleft).toBeGreaterThanOrEqual(1);
    expect(summary.overallRisk).toBe('high'); // due to gpl-library
  });
});
