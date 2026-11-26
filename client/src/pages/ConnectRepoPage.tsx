'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, Link } from '@/lib/router';
import {
  Search,
  Lock,
  Globe,
  GitBranch,
  Check,
  Plus,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import type { ConnectedRepo, GitHubRepoItem } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export default function ConnectRepoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });

  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [connectingFullName, setConnectingFullName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGitHubRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ repos: GitHubRepoItem[] }>('/api/github/repos');
      setRepos(data.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub repositories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchGitHubRepos();
    }
  }, [user, fetchGitHubRepos]);

  const filteredRepos = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return repos;
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(trimmed) ||
        (r.description && r.description.toLowerCase().includes(trimmed)) ||
        (r.language && r.language.toLowerCase().includes(trimmed)),
    );
  }, [repos, query]);

  async function handleConnect(fullName: string) {
    setConnectingFullName(fullName);
    setActionError(null);
    try {
      const { repo } = await apiFetch<{ repo: ConnectedRepo }>('/api/repos', {
        method: 'POST',
        body: JSON.stringify({ fullName }),
      });
      toast({
        variant: 'success',
        title: 'Repository Connected',
        description: `${repo.fullName} is now monitored. Click "Run Scan" on the audit page to start your first scan.`,
      });
      router.push(`/repos/${repo.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to connect repository');
      setConnectingFullName(null);
    }
  }

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading GitHub Repositories..."
        subMessage="Fetching your authorized GitHub organization and personal repos"
      />
    );
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="animate-text-reveal">
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connect a repository</h1>
          <p className="mt-1 text-sm text-muted-foreground animate-text-delay-1">
            Select a repository you own or collaborate on to enable security scanning and AI summaries.
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories by name, language, or description..."
          aria-label="Search repositories"
          className="h-10 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-[#df3407]"
        />
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-severity-critical/30 bg-severity-critical/10 p-3 text-sm text-severity-critical"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading GitHub repositories">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-3xl bg-slate-200" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-severity-critical" aria-hidden="true" />
            <p className="text-sm font-medium">Unable to fetch GitHub repositories</p>
            <p className="mt-1 max-w-md font-mono text-xs text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchGitHubRepos}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredRepos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No matching repositories found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query
                ? 'Try clearing your search filter.'
                : 'No public repositories were returned for your GitHub account.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="card-uniform divide-y divide-slate-200 overflow-hidden rounded-3xl">
          {filteredRepos.map((repo) => {
            const isConnecting = connectingFullName === repo.fullName;
            return (
              <div
                key={repo.githubRepoId}
                className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-sm font-medium">{repo.fullName}</span>
                    <Badge variant="secondary" className="text-[11px]">
                      {repo.isPrivate ? (
                        <>
                          <Lock className="h-3 w-3" aria-hidden="true" /> Private
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3" aria-hidden="true" /> Public
                        </>
                      )}
                    </Badge>
                    {repo.language && (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {repo.language}
                      </Badge>
                    )}
                  </div>
                  {repo.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>branch: {repo.defaultBranch}</span>
                    <span>updated: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {repo.alreadyConnected && repo.connectedRepoId ? (
                    <Link href={`/repos/${repo.connectedRepoId}`}>
                      <Button variant="secondary" size="sm">
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        Connected
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      disabled={connectingFullName !== null}
                      onClick={() => handleConnect(repo.fullName)}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}