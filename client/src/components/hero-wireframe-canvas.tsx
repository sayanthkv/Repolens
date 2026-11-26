import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface HeroWireframeCanvasProps {
  className?: string;
  strokeColor?: string;
  highlightColor?: string;
  highlightRow?: number;
  highlightCol?: number;
  showHighlightNode?: boolean;
  /** 0..2 continuous morph state for the Services section 3D plane */
  morphProgress?: number;
}

/**
 * 60fps HTML5 Canvas undulating 3D wireframe mesh.
 * - Pauses requestAnimationFrame when off-screen via IntersectionObserver.
 * - Disables animation loop under prefers-reduced-motion (renders one static frame).
 * - Smoothly morphs bend/rotation/shear when `morphProgress` is provided.
 */
export function HeroWireframeCanvas({
  className,
  strokeColor = 'rgba(255, 255, 255, 0.25)',
  highlightColor = '#FFFFFF',
  highlightRow = 4,
  highlightCol = 9,
  showHighlightNode = true,
  morphProgress,
}: HeroWireframeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const morphRef = useRef(morphProgress ?? 0);
  const visibleRef = useRef(true);

  useEffect(() => {
    morphRef.current = morphProgress ?? 0;
  }, [morphProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let width = 0;
    let height = 0;

    const cols = 16;
    const rows = 10;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerRef.current.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerRef.current.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = Boolean(entries[0]?.isIntersecting);
        visibleRef.current = isVisible;
        if (isVisible && !prefersReduced && rafId === 0) {
          rafId = requestAnimationFrame(render);
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);

    const projectPoint = (r: number, c: number, t: number) => {
      const u = c / cols;
      const v = r / rows;
      const px = pointerRef.current.x;
      const py = pointerRef.current.y;
      const m = morphRef.current; // 0..2

      // Morphing bend, shear, and bowl depth across service states
      const shear = (m - 1) * 38 * (v - 0.5);
      const tiltY = Math.sin(m * 1.1) * 24 * (u - 0.5);
      const wave1 = Math.sin(u * (3.8 + m * 0.8) + t * 0.85) * 16;
      const wave2 = Math.cos(v * (3.4 + m * 0.6) - t * 0.65) * 14;
      const bowl = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (24 + m * 14);

      const x =
        -width * 0.03 +
        u * (width * 1.06) +
        (v - 0.5) * 28 +
        shear +
        wave2 * 0.55 +
        px * 12 * (u - 0.5);
      const y =
        -height * 0.02 +
        v * (height * 1.04) +
        wave1 +
        tiltY +
        bowl * 0.45 +
        py * 10 * (v - 0.5);

      return { x, y };
    };

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      const grid: Array<Array<{ x: number; y: number }>> = [];
      for (let r = 0; r <= rows; r++) {
        const rowPts: Array<{ x: number; y: number }> = [];
        for (let c = 0; c <= cols; c++) {
          rowPts.push(projectPoint(r, c, t));
        }
        grid.push(rowPts);
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p1 = grid[r]?.[c];
          const p2 = grid[r]?.[c + 1];
          if (p1 && p2) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }

      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r < rows; r++) {
          const p1 = grid[r]?.[c];
          const p2 = grid[r + 1]?.[c];
          if (p1 && p2) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();

      if (showHighlightNode && highlightRow < rows && highlightCol < cols) {
        const tl = grid[highlightRow]?.[highlightCol];
        const tr = grid[highlightRow]?.[highlightCol + 1];
        const br = grid[highlightRow + 1]?.[highlightCol + 1];
        const bl = grid[highlightRow + 1]?.[highlightCol];

        if (tl && tr && br && bl) {
          ctx.save();
          ctx.strokeStyle = highlightColor;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tl.x, tl.y);
          ctx.lineTo(tr.x, tr.y);
          ctx.lineTo(br.x, br.y);
          ctx.lineTo(bl.x, bl.y);
          ctx.closePath();
          ctx.stroke();

          const nodeX = (tr.x + br.x) * 0.5;
          const nodeY = (tr.y + br.y) * 0.5;
          const pulse = prefersReduced ? 1 : 1 + Math.sin(t * 3.8) * 0.4;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 12 * pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = highlightColor;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };

    const render = (now: number) => {
      rafId = 0;
      if (!visibleRef.current) return;

      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.06;
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.06;

      drawFrame(now * 0.001);
      if (!prefersReduced) {
        rafId = requestAnimationFrame(render);
      }
    };

    if (prefersReduced) {
      drawFrame(0);
    } else {
      rafId = requestAnimationFrame(render);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [strokeColor, highlightColor, highlightRow, highlightCol, showHighlightNode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none h-full w-full', className)}
    />
  );
}
