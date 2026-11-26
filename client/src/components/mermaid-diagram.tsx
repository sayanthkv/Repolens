'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: resolvedTheme === 'light' ? 'default' : 'dark',
        });

        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);
        if (!cancelled) {
          setSvg(renderedSvg);
          setRenderFailed(false);
        }
      } catch {
        if (!cancelled) {
          setSvg(null);
          setRenderFailed(true);
        }
      }
    }

    renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart, diagramId, resolvedTheme]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {!renderFailed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSource((prev) => !prev)}
          >
            {showSource ? (
              <>
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                View Diagram
              </>
            ) : (
              <>
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                View Mermaid Source
              </>
            )}
          </Button>
        )}
      </div>

      {renderFailed || showSource || !svg ? (
        <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed">
          {chart}
        </pre>
      ) : (
        <div
          className="overflow-x-auto rounded-md border border-border bg-background/60 p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}