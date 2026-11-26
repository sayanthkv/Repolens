import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CubeFace {
  id: string;
  label: string;
  file: string;
  tag: string;
  accent: string;
  lines: Array<{ text: string; tone?: 'muted' | 'blue' | 'emerald' | 'rose' | 'amber' }>;
}

const FACES: CubeFace[] = [
  {
    id: 'front',
    label: 'Secrets',
    file: 'secretsScanner.ts',
    tag: 'ENTROPY',
    accent: 'from-blue-500/25 via-transparent to-cyan-400/15',
    lines: [
      { text: 'const H = shannonEntropy(val);', tone: 'blue' },
      { text: 'if (H > 4.2 && !isDummy(val)) {', tone: 'muted' },
      { text: '  flag("SEC-HIGH-ENTROPY");', tone: 'rose' },
      { text: '  return maskSecret(val);', tone: 'emerald' },
      { text: '}', tone: 'muted' },
    ],
  },
  {
    id: 'right',
    label: 'Patterns',
    file: 'patternScanner.ts',
    tag: 'FIX PR',
    accent: 'from-emerald-500/25 via-transparent to-teal-400/15',
    lines: [
      { text: '// Unsafe shell interpolation', tone: 'muted' },
      { text: '- execSync(`git log ${ref}`);', tone: 'rose' },
      { text: '+ execFileSync("git", ["log", ref]);', tone: 'emerald' },
      { text: 'await openFixPullRequest();', tone: 'blue' },
    ],
  },
  {
    id: 'back',
    label: 'OSV CVEs',
    file: 'dependencyScanner.ts',
    tag: '1H CACHE',
    accent: 'from-indigo-500/25 via-transparent to-blue-400/15',
    lines: [
      { text: 'const res = await fetch(', tone: 'muted' },
      { text: '  "https://api.osv.dev/v1/querybatch"', tone: 'blue' },
      { text: ');', tone: 'muted' },
      { text: 'osvCache.set(pkg, vulns);', tone: 'emerald' },
    ],
  },
  {
    id: 'left',
    label: 'Webhooks',
    file: 'webhookVerify.ts',
    tag: 'HMAC-256',
    accent: 'from-cyan-500/25 via-transparent to-sky-400/15',
    lines: [
      { text: 'const expected = hmacSha256(body);', tone: 'blue' },
      { text: 'return crypto.timingSafeEqual(', tone: 'emerald' },
      { text: '  Buffer.from(sig),', tone: 'muted' },
      { text: '  Buffer.from(expected)', tone: 'muted' },
      { text: ');', tone: 'emerald' },
    ],
  },
  {
    id: 'top',
    label: 'Queue',
    file: 'scanQueue.ts',
    tag: 'RECOVERY',
    accent: 'from-amber-500/25 via-transparent to-orange-400/15',
    lines: [
      { text: 'const pending = await Scan.find({', tone: 'muted' },
      { text: '  status: { $in: ["queued", "running"] }', tone: 'amber' },
      { text: '});', tone: 'muted' },
      { text: 'pending.forEach(reEnqueue);', tone: 'emerald' },
    ],
  },
  {
    id: 'bottom',
    label: 'Crypto',
    file: 'crypto.ts',
    tag: 'AES-GCM',
    accent: 'from-violet-500/25 via-transparent to-indigo-400/15',
    lines: [
      { text: 'const iv = randomBytes(12);', tone: 'blue' },
      { text: 'const cipher = createCipheriv(', tone: 'muted' },
      { text: '  "aes-256-gcm", KEY, iv', tone: 'emerald' },
      { text: ');', tone: 'muted' },
    ],
  },
];

const TONE_CLASS: Record<NonNullable<CubeFace['lines'][number]['tone']>, string> = {
  muted: 'text-slate-400',
  blue: 'text-sky-300',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
  amber: 'text-amber-300',
};

/** Computes directional lighting intensity [0.32 .. 1.0] for each cube face normal. */
function computeFaceLighting(faceId: string, rxDeg: number, ryDeg: number): number {
  const rx = (rxDeg * Math.PI) / 180;
  const ry = (ryDeg * Math.PI) / 180;

  let nx = 0;
  let ny = 0;
  let nz = 0;
  if (faceId === 'front') nz = 1;
  else if (faceId === 'back') nz = -1;
  else if (faceId === 'right') nx = 1;
  else if (faceId === 'left') nx = -1;
  else if (faceId === 'top') ny = -1;
  else if (faceId === 'bottom') ny = 1;

  // Rotate Y then X (matching CSS transform order rotateX(rx) rotateY(ry))
  const x1 = nx * Math.cos(ry) + nz * Math.sin(ry);
  const z1 = -nx * Math.sin(ry) + nz * Math.cos(ry);
  const y2 = ny * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = ny * Math.sin(rx) + z1 * Math.cos(rx);

  // Key light from top-left-front (-0.38, -0.58, 0.72)
  const dot = x1 * -0.38 + y2 * -0.58 + z2 * 0.72;
  return Math.max(0.38, Math.min(1, 0.68 + dot * 0.42));
}

function CubeFaceCard({
  face,
  transform,
  lighting,
}: {
  face: CubeFace;
  transform: string;
  lighting: number;
}) {
  const shadeOpacity = Math.max(0, (1 - lighting) * 0.65);

  return (
    <div
      style={{ transform, backfaceVisibility: 'hidden' }}
      className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-none border border-blue-400/30 bg-gradient-to-br from-[#131C31] via-[#0B1120] to-[#060913] p-4 text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),inset_0_-8px_24px_rgba(0,0,0,0.6),0_18px_45px_rgba(15,23,42,0.28)] select-none"
    >
      {/* Subtle glass specular gradient */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-75',
          face.accent,
        )}
      />
      {/* Directional 3D shading overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-slate-950 transition-opacity duration-75"
        style={{ opacity: shadeOpacity }}
      />
      {/* Top specular glass reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Terminal Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </div>
        <span className="font-mono text-[10.5px] font-medium text-slate-300/90 truncate max-w-[140px]">
          {face.file}
        </span>
      </div>

      {/* Syntax-Highlighted Code with Line Numbers */}
      <pre className="relative z-10 my-auto overflow-hidden font-mono text-[11px] leading-[1.65]">
        {face.lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-3 shrink-0 select-none text-right text-[9.5px] text-slate-600">
              {i + 1}
            </span>
            <span
              className={cn(
                'truncate',
                line.tone ? TONE_CLASS[line.tone] : 'text-slate-200',
              )}
            >
              {line.text}
            </span>
          </div>
        ))}
      </pre>

      {/* Footer Metadata */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2.5 font-mono text-[9.5px] uppercase tracking-wider">
        <span className="flex items-center gap-1.5 font-semibold text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
          {face.label}
        </span>
        <span className="rounded-md border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-200">
          {face.tag}
        </span>
      </div>
    </div>
  );
}

/**
 * Interactive 3D rotatable code cube built with React + CSS 3D transforms.
 * Includes directional 3D face lighting, drag inertia, and hover pause.
 */
export function CodeCube3D({ className }: { className?: string }) {
  const [rotation, setRotation] = useState({ x: -15, y: -26 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; rx: number; ry: number; lastX: number; lastY: number } | null>(null);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || isDragging) return;

    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      setRotation((prev) => {
        const vx = velocityRef.current.vx;
        const vy = velocityRef.current.vy;

        // Apply drag inertia decay
        velocityRef.current.vx *= 0.92;
        velocityRef.current.vy *= 0.92;

        const idleSpin = isHovered ? 0 : 14;
        const nextX = Math.max(-88, Math.min(88, prev.x + vx * dt * 60));
        const nextY = prev.y + vy * dt * 60 + dt * idleSpin;
        return { x: nextX, y: nextY };
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, isHovered]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    velocityRef.current = { vx: 0, vy: 0 };
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rx: rotation.x,
      ry: rotation.y,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const stepX = e.clientX - dragStartRef.current.lastX;
    const stepY = e.clientY - dragStartRef.current.lastY;

    dragStartRef.current.lastX = e.clientX;
    dragStartRef.current.lastY = e.clientY;
    velocityRef.current = { vx: -stepY * 0.16, vy: stepX * 0.16 };

    setRotation({
      x: Math.max(-88, Math.min(88, dragStartRef.current.rx - dy * 0.45)),
      y: dragStartRef.current.ry + dx * 0.45,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // 260x260px sharp-edged realistic cube (half-depth z = 130px)
  const z = 130;

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* Ambient sky-blue radial aura behind cube */}
      <div className="pointer-events-none absolute top-6 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/25 via-indigo-300/20 to-cyan-300/25 blur-3xl" />

      {/* 3D Perspective Stage */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="region"
        aria-label="Interactive 3D security code cube. Drag to rotate."
        className={cn(
          'relative flex h-[340px] w-full items-center justify-center touch-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ perspective: '1150px' }}
      >
        <div
          className="relative h-[260px] w-[260px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 60ms linear',
          }}
        >
          <CubeFaceCard
            face={FACES[0]!}
            transform={`translateZ(${z}px)`}
            lighting={computeFaceLighting('front', rotation.x, rotation.y)}
          />
          <CubeFaceCard
            face={FACES[1]!}
            transform={`rotateY(90deg) translateZ(${z}px)`}
            lighting={computeFaceLighting('right', rotation.x, rotation.y)}
          />
          <CubeFaceCard
            face={FACES[2]!}
            transform={`rotateY(180deg) translateZ(${z}px)`}
            lighting={computeFaceLighting('back', rotation.x, rotation.y)}
          />
          <CubeFaceCard
            face={FACES[3]!}
            transform={`rotateY(-90deg) translateZ(${z}px)`}
            lighting={computeFaceLighting('left', rotation.x, rotation.y)}
          />
          <CubeFaceCard
            face={FACES[4]!}
            transform={`rotateX(90deg) translateZ(${z}px)`}
            lighting={computeFaceLighting('top', rotation.x, rotation.y)}
          />
          <CubeFaceCard
            face={FACES[5]!}
            transform={`rotateX(-90deg) translateZ(${z}px)`}
            lighting={computeFaceLighting('bottom', rotation.x, rotation.y)}
          />
        </div>

        {/* Soft physical contact shadow under the floating cube */}
        <div className="pointer-events-none absolute bottom-3 h-5 w-44 rounded-full bg-slate-900/15 blur-xl" />
      </div>
    </div>
  );
}
