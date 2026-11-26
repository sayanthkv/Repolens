import React from 'react';
import { cn } from '@/lib/utils';

interface RepoLensLogoProps {
  className?: string;
}

/**
 * Meaningful RepoLens mark: a magnifying lens inspecting a Git repository branch.
 * Matches client/public/favicon.svg 1:1.
 */
export function RepoLensLogo({ className }: RepoLensLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={cn('h-7 w-7 shrink-0', className)}
    >
      <defs>
        <linearGradient id="rl-logo-bg" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="rl-logo-glass" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="10"
        fill="url(#rl-logo-bg)"
        stroke="#3B82F6"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <circle cx="15.5" cy="15.5" r="8.5" fill="url(#rl-logo-glass)" stroke="#FFFFFF" strokeWidth="2.1" />
      <path d="M21.8 21.8L27.5 27.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13 11.5V19.5" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 17.5C13 15.6 18 16 18 13.5" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="13" cy="11.5" r="1.7" fill="#FFFFFF" />
      <circle cx="13" cy="19.5" r="1.7" fill="#38BDF8" />
      <circle cx="18" cy="13.5" r="1.7" fill="#38BDF8" />
    </svg>
  );
}
