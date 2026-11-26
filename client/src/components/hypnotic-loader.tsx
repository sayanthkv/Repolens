import React from 'react';

interface HypnoticLoaderProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export function HypnoticLoader({
  message,
  subMessage,
  className = '',
}: HypnoticLoaderProps) {
  return (
    <div className={`min-h-[55vh] flex flex-col items-center justify-center p-6 text-slate-800 ${className}`}>
      {/* Minimal & Small Simple Hypnotic Circle */}
      <div className="relative flex items-center justify-center w-9 h-9">
        <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-md" />
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-blue-600 border-r-slate-900 animate-spin [animation-duration:1.1s]" />
        <div className="absolute inset-1.5 rounded-full border-2 border-transparent border-b-blue-500 border-l-slate-400 animate-spin [animation-duration:0.8s] [animation-direction:reverse]" />
        <div className="relative h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
      </div>

      {(message || subMessage) && (
        <div className="mt-4 text-center space-y-0.5">
          {message && (
            <p className="text-xs font-semibold tracking-wide text-slate-800">
              {message}
            </p>
          )}
          {subMessage && (
            <p className="text-[11px] text-slate-500">
              {subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
