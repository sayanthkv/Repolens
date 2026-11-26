import React from 'react';
import { cn } from '@/lib/utils';

export function WarpedMeshSvg({
  className,
  stroke = 'rgba(255,255,255,0.28)',
  accent = '#ffffff',
  showNode = false,
}: {
  className?: string;
  stroke?: string;
  accent?: string;
  showNode?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('pointer-events-none select-none', className)}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const y = 30 + i * 28;
        const bend = Math.sin(i * 0.7) * 24;
        return (
          <path
            key={`h-${i}`}
            d={`M 20 ${y} Q 140 ${y - 26 + bend} 220 ${y + bend * 0.6} T 400 ${y - 10}`}
            stroke={stroke}
            strokeWidth="1"
          />
        );
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((j) => {
        const x = 35 + j * 38;
        const bend = Math.cos(j * 0.6) * 20;
        return (
          <path
            key={`v-${j}`}
            d={`M ${x} 20 Q ${x + bend} 145 ${x - bend * 0.5} 210 T ${x + 12} 280`}
            stroke={stroke}
            strokeWidth="1"
          />
        );
      })}
      {showNode && (
        <g>
          <rect x="208" y="102" width="44" height="44" stroke={accent} strokeWidth="1.5" strokeOpacity="0.85" />
          <circle cx="252" cy="124" r="14" fill={accent} fillOpacity="0.22" />
          <circle cx="252" cy="124" r="5" fill={accent} />
        </g>
      )}
    </svg>
  );
}

export function GeodesicOrbSvg({
  className,
  stroke = 'currentColor',
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 180 180" fill="none" aria-hidden="true" className={cn('h-36 w-36', className)}>
      <circle cx="90" cy="90" r="68" stroke={stroke} strokeWidth="1" />
      <ellipse cx="90" cy="90" rx="68" ry="26" stroke={stroke} strokeWidth="1" />
      <ellipse cx="90" cy="90" rx="68" ry="48" stroke={stroke} strokeWidth="1" />
      <ellipse cx="90" cy="90" rx="28" ry="68" stroke={stroke} strokeWidth="1" />
      <ellipse cx="90" cy="90" rx="50" ry="68" stroke={stroke} strokeWidth="1" />
      <path d="M26 68 L62 50 L90 62 L118 50 L154 68" stroke={stroke} strokeWidth="0.9" />
      <path d="M26 112 L62 130 L90 118 L118 130 L154 112" stroke={stroke} strokeWidth="0.9" />
      <line x1="90" y1="22" x2="90" y2="158" stroke={stroke} strokeWidth="0.9" />
      <line x1="22" y1="90" x2="158" y2="90" stroke={stroke} strokeWidth="0.9" />
    </svg>
  );
}

export function TorusMeshSvg({
  className,
  stroke = 'currentColor',
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 180 180" fill="none" aria-hidden="true" className={cn('h-36 w-36', className)}>
      <circle cx="90" cy="90" r="68" stroke={stroke} strokeWidth="1" />
      {[56, 44, 32, 20, 10].map((r) => (
        <circle key={r} cx="102" cy="82" r={r} stroke={stroke} strokeWidth="0.9" />
      ))}
      {[0, 30, 60, 90, 120, 150].map((deg) => (
        <ellipse
          key={deg}
          cx="90"
          cy="90"
          rx="68"
          ry="24"
          transform={`rotate(${deg} 90 90)`}
          stroke={stroke}
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
}

export function LatitudeOrbSvg({
  className,
  stroke = 'currentColor',
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 180 180" fill="none" aria-hidden="true" className={cn('h-36 w-36', className)}>
      <circle cx="90" cy="90" r="68" stroke={stroke} strokeWidth="1" />
      {[-48, -32, -16, 0, 16, 32, 48].map((dy) => {
        const rx = Math.sqrt(Math.max(0, 68 * 68 - dy * dy));
        return (
          <ellipse
            key={dy}
            cx="90"
            cy={90 + dy}
            rx={rx}
            ry={rx * 0.28}
            stroke={stroke}
            strokeWidth="0.9"
            strokeDasharray="3 3"
          />
        );
      })}
      <circle cx="116" cy="54" r="10" stroke={stroke} strokeWidth="1" />
      <circle cx="116" cy="54" r="3" fill={stroke} />
    </svg>
  );
}

/**
 * Rim-lit dark editorial silhouette anchored in the hero bottom-left,
 * blending seamlessly into the #E63B08 background.
 */
export function CyberSilhouetteSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('pointer-events-none select-none', className)}
    >
      <defs>
        <linearGradient id="cyber-rim" x1="190" y1="80" x2="360" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF9068" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#E63B08" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#140905" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cyber-body" x1="80" y1="60" x2="260" y2="450" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#171210" />
          <stop offset="65%" stopColor="#0D0B0A" />
          <stop offset="100%" stopColor="#080706" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="visor-glow" x1="205" y1="140" x2="295" y2="195" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A4D" />
          <stop offset="100%" stopColor="#B82500" />
        </linearGradient>
      </defs>

      {/* Collar & Jacket Shoulders */}
      <path
        d="M25 460 L58 318 C72 282 108 264 132 252 L145 212 L222 232 L212 292 L262 325 L235 460 Z"
        fill="url(#cyber-body)"
        stroke="url(#cyber-rim)"
        strokeWidth="2.5"
      />
      {/* Head Profile Looking Up-Right */}
      <path
        d="M144 235 C120 218 96 190 98 148 C100 94 148 56 206 62 C258 68 286 102 284 144 C283 158 296 168 296 178 C296 186 284 189 283 196 C282 204 288 210 282 218 C276 226 262 236 238 238 L220 242 Z"
        fill="url(#cyber-body)"
        stroke="url(#cyber-rim)"
        strokeWidth="2.2"
      />
      {/* Orange Rim-Lit Visor Glasses + Occasional 2-frame Glitch Bars */}
      <path
        d="M222 142 L283 144 C289 152 286 174 268 178 L224 172 C214 166 214 148 222 142 Z"
        fill="url(#visor-glow)"
        fillOpacity="0.88"
        stroke="#FFB59C"
        strokeWidth="1.5"
      />
      <g className="animate-glasses-glitch">
        <rect x="214" y="150" width="76" height="3.5" fill="#080706" />
        <rect x="218" y="161" width="68" height="2.5" fill="#080706" />
      </g>
      <path
        d="M146 154 L220 148"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
