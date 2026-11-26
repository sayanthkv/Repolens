import { describe, it, expect } from 'vitest';
import { splitFileIntoChunks } from '../services/rag/repoChat';

describe('splitFileIntoChunks', () => {
  it('splits large files into overlapping ~150-line chunks and redacts secrets', () => {
    const lines = Array.from({ length: 310 }, (_, idx) =>
      idx === 10
        ? 'const awsKey = "AKIAIOSFODNN7EXAMPLE";'
        : `export const line_${idx + 1} = ${idx + 1};`,
    );

    const chunks = splitFileIntoChunks({
      path: 'src/bigFile.ts',
      size: 5000,
      content: lines.join('\n'),
    });

    expect(chunks.length).toBe(3);
    expect(chunks[0]?.startLine).toBe(1);
    expect(chunks[0]?.endLine).toBe(150);
    expect(chunks[1]?.startLine).toBe(136);
    expect(chunks[1]?.endLine).toBe(285);
    expect(chunks[0]?.content).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(chunks[0]?.content).toContain('[REDACTED:AKIA****PLE]');
  });

  it('skips package-lock.json files', () => {
    const chunks = splitFileIntoChunks({
      path: 'package-lock.json',
      size: 1000,
      content: '{"name":"demo"}',
    });
    expect(chunks).toHaveLength(0);
  });
});