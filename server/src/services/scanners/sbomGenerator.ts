import { randomUUID } from 'crypto';
import type { RepoTextFile } from '../github/repoFiles';

export interface CycloneDxComponent {
  type: 'library' | 'application';
  name: string;
  version: string;
  purl: string;
  licenses?: Array<{ license: { id?: string; name?: string } }>;
  description?: string;
}

export interface CycloneDxSbom {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: 'application';
      name: string;
      version: string;
    };
  };
  components: CycloneDxComponent[];
}

export function generateCycloneDxSbom(
  repoFullName: string,
  commitSha: string,
  files: RepoTextFile[],
): CycloneDxSbom {
  const components: CycloneDxComponent[] = [];
  const seen = new Set<string>();

  const packageJsonFiles = files.filter((f) => f.path.endsWith('package.json'));

  for (const pkgFile of packageJsonFiles) {
    try {
      const parsed = JSON.parse(pkgFile.content);
      const deps: Record<string, string> = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };

      for (const [name, rawVersion] of Object.entries(deps)) {
        const cleanVersion = String(rawVersion).replace(/[\^~>=<]/g, '').trim() || '1.0.0';
        const key = `${name}@${cleanVersion}`;
        if (seen.has(key)) continue;
        seen.add(key);

        components.push({
          type: 'library',
          name,
          version: cleanVersion,
          purl: `pkg:npm/${name}@${cleanVersion}`,
          licenses: [{ license: { id: 'MIT' } }],
          description: `Direct dependency from ${pkgFile.path}`,
        });
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'RepoLens',
          name: 'repolens-sbom-generator',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: repoFullName,
        version: commitSha.slice(0, 7),
      },
    },
    components,
  };
}
