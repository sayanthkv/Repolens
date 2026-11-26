import React, { useState } from 'react';
import {
  KeyRound,
  FileCode,
  Package,
  Layers,
  Lock,
  Globe,
  Sparkles,
  Terminal,
  Cloud,
} from 'lucide-react';

interface SecurityControl {
  id: string;
  label: string;
  category: string;
  status: 'covered' | 'issues' | 'uncovered';
  icon: React.ComponentType<{ className?: string }>;
  angle: number; // in degrees from 0 (top)
  distance: number; // 0 to 1 radius percentage
}

const DEFAULT_CONTROLS: SecurityControl[] = [
  { id: '1', label: 'Phishing & AST Code', category: 'SAST Scan', status: 'covered', icon: FileCode, angle: 345, distance: 0.8 },
  { id: '2', label: 'Cloud Posture', category: 'IaC & Env', status: 'covered', icon: Cloud, angle: 30, distance: 0.85 },
  { id: '3', label: 'External Footprint', category: 'Attack Surface', status: 'covered', icon: Globe, angle: 75, distance: 0.8 },
  { id: '4', label: 'Dark Web & Secrets', category: 'Credentials', status: 'issues', icon: KeyRound, angle: 120, distance: 0.75 },
  { id: '5', label: 'Cloud Data & SBOM', category: 'Compliance', status: 'covered', icon: Layers, angle: 165, distance: 0.7 },
  { id: '6', label: 'Email & Dependencies', category: 'SCA Supply Chain', status: 'issues', icon: Package, angle: 210, distance: 0.85 },
  { id: '7', label: 'Endpoint Security', category: 'DevSecOps', status: 'covered', icon: Terminal, angle: 255, distance: 0.75 },
  { id: '8', label: 'Secure Browsing', category: 'Network', status: 'covered', icon: Lock, angle: 295, distance: 0.7 },
  { id: '9', label: 'Security Awareness', category: 'AI Remediation', status: 'covered', icon: Sparkles, angle: 325, distance: 0.65 },
];

export function SecurityRadar() {
  const [activeControl, setActiveControl] = useState<SecurityControl | null>(null);

  const size = 370;
  const center = size / 2;
  const radius = 125;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Top Legend matching Guardz screenshot */}
      <div className="mb-4 flex w-full items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-200">Continuous Code &amp; Cloud Telemetry</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            Uncovered
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            Covered
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            Issues
          </span>
        </div>
      </div>

      {/* Radar SVG Container */}
      <div className="relative flex items-center justify-center my-2" style={{ width: size, height: size }}>
        {/* Soft Indigo Sonar Center Glow */}
        <div className="absolute inset-14 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <svg width={size} height={size} className="overflow-visible">
          <defs>
            {/* Radar Sweep Gradient */}
            <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>

            {/* Radar Center Depth Glow */}
            <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e2652" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#070913" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Sonar Disk */}
          <circle cx={center} cy={center} r={radius} fill="url(#radarCenterGlow)" />

          {/* Concentric Grid Rings */}
          {[0.3, 0.55, 0.8, 1].map((scale, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius * scale}
              fill="none"
              stroke="#1f2850"
              strokeWidth={i === 3 ? 1.5 : 1}
              strokeDasharray={i === 1 ? '3 3' : undefined}
            />
          ))}

          {/* Cross Axes Lines */}
          <line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            stroke="#1d264c"
            strokeWidth="1"
          />
          <line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            stroke="#1d264c"
            strokeWidth="1"
          />
          <line
            x1={center - radius * 0.707}
            y1={center - radius * 0.707}
            x2={center + radius * 0.707}
            y2={center + radius * 0.707}
            stroke="#1d264c"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
          <line
            x1={center + radius * 0.707}
            y1={center - radius * 0.707}
            x2={center - radius * 0.707}
            y2={center + radius * 0.707}
            stroke="#1d264c"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />

          {/* Animated Sweeping Sonar Wedge */}
          <g className="animate-radar-sweep" style={{ transformOrigin: `${center}px ${center}px` }}>
            <path
              d={`M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 0 1 ${
                center + radius * 0.707
              } ${center - radius * 0.707} Z`}
              fill="url(#sweepGradient)"
            />
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - radius}
              stroke="#818cf8"
              strokeWidth="2"
              className="drop-shadow-[0_0_8px_#818cf8]"
            />
          </g>

          {/* Center Hub Indicator */}
          <circle cx={center} cy={center} r={4.5} fill="#6366f1" className="shadow-[0_0_12px_#6366f1]" />
          <circle cx={center} cy={center} r={9} fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />

          {/* Active Control Dots on the Sonar Plane */}
          {DEFAULT_CONTROLS.map((control) => {
            const rad = ((control.angle - 90) * Math.PI) / 180;
            const x = center + radius * control.distance * Math.cos(rad);
            const y = center + radius * control.distance * Math.sin(rad);
            const isIssue = control.status === 'issues';

            return (
              <g
                key={control.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onMouseEnter={() => setActiveControl(control)}
                onMouseLeave={() => setActiveControl(null)}
              >
                {isIssue && (
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isIssue ? 4.5 : 3.5}
                  fill={isIssue ? '#f43f5e' : '#6366f1'}
                  className={
                    isIssue
                      ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                      : 'drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]'
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* Outer Circular Spoke Labels & Icons (Matches Guardz Screenshot) */}
        {DEFAULT_CONTROLS.map((control) => {
          const rad = ((control.angle - 90) * Math.PI) / 180;
          const labelDist = radius + 34;
          const x = center + labelDist * Math.cos(rad);
          const y = center + labelDist * Math.sin(rad);
          const Icon = control.icon;
          const isIssue = control.status === 'issues';

          return (
            <div
              key={`label-${control.id}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-1 transition-all duration-200 hover:scale-105 z-10"
              style={{ left: `${x}px`, top: `${y}px` }}
              onMouseEnter={() => setActiveControl(control)}
              onMouseLeave={() => setActiveControl(null)}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                  isIssue
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : 'border-[#263162] bg-[#0c1026] text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300'
                }`}
              >
                <Icon className="h-3 w-3" />
              </div>
              <span
                className={`whitespace-nowrap text-[9px] font-medium leading-none ${
                  isIssue ? 'text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {control.label}
              </span>
            </div>
          );
        })}

        {/* Hover Tooltip Card */}
        {activeControl && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-xl border border-indigo-500/40 bg-[#0c1026]/95 px-3 py-1.5 shadow-2xl backdrop-blur z-20">
            <p className="text-xs font-semibold text-white">
              {activeControl.label} ({activeControl.category})
            </p>
            <p className="text-[10px] text-slate-400">
              Status:{' '}
              <span
                className={
                  activeControl.status === 'issues'
                    ? 'font-bold text-rose-400'
                    : 'font-bold text-indigo-400'
                }
              >
                {activeControl.status.toUpperCase()}
              </span>{' '}
              • Continuous Scan Active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
