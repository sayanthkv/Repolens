'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import type { HealthResponse } from '@repolens/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function FoundationStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(${API_BASE_URL}/api/health, { cache: 'no-store' });
      if (!response.ok) throw new Error(API responded with HTTP );
      const data: HealthResponse = await response.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach RepoLens API');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-semibold tracking-tight">RepoLens</span>
            <Badge variant="secondary" className="font-mono text-[11px]">Phase 1</Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Understand and secure your code</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Foundation environment check — verifying monorepo workspace, Express API, MongoDB connection, and design system tokens.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <CardTitle>Backend Health Status</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={checkHealth} disabled={loading}>
              <RefreshCw className={h-3.5 w-3.5 } />
              Refresh
            </Button>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3" aria-label="Loading health status">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : error ? (
              <div role="alert" className="flex flex-col items-start justify-between gap-4 rounded-md border border-severity-critical/30 bg-severity-critical/10 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-severity-critical" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-severity-critical">API Connection Failed</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{error}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={checkHealth}>Retry</Button>
              </div>
            ) : health ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    API {health.status.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">Database: {health.database}</Badge>
                  <Badge variant="secondary" className="font-mono">{health.service}</Badge>
                </div>
                <dl className="grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/40 p-4 font-mono text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Endpoint</dt>
                    <dd className="mt-1 text-foreground">{API_BASE_URL}/api/health</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Uptime</dt>
                    <dd className="mt-1 text-foreground">{health.uptimeSeconds}s</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Server Time</dt>
                    <dd className="mt-1 text-foreground">{health.timestamp}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}