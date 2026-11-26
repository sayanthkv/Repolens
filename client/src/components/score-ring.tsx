interface ScoreRingProps {
  score: number | null;
  size?: number;
}

export function ScoreRing({ score, size = 56 }: ScoreRingProps) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = score !== null ? Math.max(0, Math.min(100, score)) : 0;
  const dashOffset = circumference - (normalized / 100) * circumference;

  const strokeColor =
    score === null
      ? 'stroke-muted-foreground/30'
      : score >= 80
        ? 'stroke-emerald-500'
        : score >= 60
          ? 'stroke-severity-medium'
          : score >= 40
            ? 'stroke-severity-high'
            : 'stroke-severity-critical';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={score !== null ? `Security score ${score} out of 100` : 'Not scanned yet'}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {score !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={strokeColor}
          />
        )}
      </svg>
      <span className="absolute font-mono text-xs font-semibold">
        {score !== null ? score : '—'}
      </span>
    </div>
  );
}