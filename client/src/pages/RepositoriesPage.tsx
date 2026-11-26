import { useCallback, useEffect, useMemo, useState } from 'react';
import Link, { useRouter } from '@/lib/router';
import {
  GitBranch,
  Play,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Globe,
  Lock,
  Radio,
} from 'lucide-react';
import type { ConnectedRepo } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export default function RepositoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  const loadRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ repos: ConnectedRepo[] }>('/api/repos');
      setRepos(data.repos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connected repositories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRepos();
    }
  }, [user, loadRepos]);

  const handleTriggerScan = (repoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setScanningRepoId(repoId);
    router.push(`/repos/${repoId}?autostart=1`);
  };

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      const matchesSearch = repo.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      const score = repo.securityScore ?? 100;
      if (filterScore === 'healthy') return score >= 80;
      if (filterScore === 'warning') return score >= 60 && score < 80;
      if (filterScore === 'critical') return score < 60;
      return true;
    });
  }, [repos, searchQuery, filterScore]);

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading Repositories..."
        subMessage="Syncing your monitored projects and security ratings"
      />
    );
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="animate-text-reveal">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Repositories
            </h1>
            <p className="text-xs text-slate-500 mt-1 animate-text-delay-1">
              Connected GitHub repositories under continuous static and dependency analysis.
            </p>
          </div>
          <Link href="/repos/connect">
            <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Connect Repository
            </Button>
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-[#df3407] focus:outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status:
            </span>
            <div className="flex rounded-sm border border-slate-200 bg-white p-1 text-xs shadow-sm">
              {(['all', 'healthy', 'warning', 'critical'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterScore(filter)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    filterScore === filter
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repositories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-56 rounded-3xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <div className="card-uniform rounded-3xl border-rose-500/20 bg-rose-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-400 mb-2" />
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <Button variant="outline" size="sm" onClick={loadRepos} className="mt-3">
              Try Again
            </Button>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="card-uniform rounded-3xl border-dashed p-12 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-slate-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No repositories found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search or filter criteria.' : 'Connect your first GitHub repository to start continuous security monitoring.'}
            </p>
            {!searchQuery && (
              <Link href="/repos/connect" className="inline-block mt-4">
                <Button size="sm">Connect GitHub Repo</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => {
              const score = repo.securityScore ?? 100;
              const isScanning = scanningRepoId === repo.id;
              const repoName = repo.fullName.split('/')[1] || repo.fullName;
              const repoOwner = repo.fullName.split('/')[0] || '';

              return (
                <div
                  key={repo.id}
                  className="card-uniform flex flex-col justify-between rounded-3xl p-5"
                >
                  <div>
                    {/* Top Row: Title + Score Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="truncate">
                        <span className="text-[10px] font-mono text-slate-500">{repoOwner}/</span>
                        <h3 className="truncate text-sm font-semibold text-slate-900 hover:underline">
                          <Link href={`/repos/${repo.id}`}>{repoName}</Link>
                        </h3>
                      </div>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold border ${
                          score >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : score >= 60
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {score}
                      </div>
                    </div>

                    {/* Metadata Tags */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 font-mono">
                        <GitBranch className="h-2.5 w-2.5 text-slate-500" />
                        {repo.defaultBranch}
                      </span>
                      {repo.webhookActive && (
                        <span className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                          <Radio className="h-2.5 w-2.5" />
                          Webhook
                        </span>
                      )}
                      {repo.isPrivate ? (
                        <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">
                          <Lock className="h-2.5 w-2.5" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">
                          <Globe className="h-2.5 w-2.5" /> Public
                        </span>
                      )}
                    </div>

                    {/* Severity Counters Bar */}
                    <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-[10px]">
                      <div>
                        <span className="block text-slate-500">Crit</span>
                        <span className="font-mono font-semibold text-rose-400">{repo.counts.critical}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">High</span>
                        <span className="font-mono font-semibold text-orange-400">{repo.counts.high}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Med</span>
                        <span className="font-mono font-semibold text-amber-400">{repo.counts.medium}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Low</span>
                        <span className="font-mono font-semibold text-blue-400">{repo.counts.low}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {repo.lastScanAt ? `${new Date(repo.lastScanAt).toLocaleDateString()}` : 'Not scanned'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleTriggerScan(repo.id, e)}
                        disabled={isScanning}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-900 hover:bg-white/[0.12] transition-colors disabled:opacity-50"
                      >
                        <Play className={`h-2.5 w-2.5 ${isScanning ? 'animate-spin' : ''}`} />
                        <span>{isScanning ? 'Scanning' : 'Scan'}</span>
                      </button>
                      <Link
                        href={`/repos/${repo.id}`}
                        className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-white/[0.12] transition-colors"
                      >
                        Audit →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
