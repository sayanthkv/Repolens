import type { SeverityCounts } from '@repolens/shared';

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 6) {
    return '****';
  }
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
}

export function maskLinePreview(line: string, matchedSecret: string): string {
  const masked = maskSecret(matchedSecret);
  const replaced = line.replace(matchedSecret, masked).trim();
  return replaced.length > 160 ? `${replaced.slice(0, 157)}...` : replaced;
}

export function calculateSecurityScore(counts: SeverityCounts): number {
  const penalty =
    counts.critical * 15 + counts.high * 8 + counts.medium * 3 + counts.low * 1;
  return Math.max(0, 100 - penalty);
}