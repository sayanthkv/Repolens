import { useCallback, useEffect, useState } from 'react';
import Link, { useRouter } from '@/lib/router';
import {
  GitBranch,
  Play,
  KeyRound,
  Terminal,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Package,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';
import type { ConnectedRepo } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { CodeCube3D } from '@/components/code-cube-3d';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRepos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ repos: ConnectedRepo[] }>('/api/repos');
      setRepos(data.repos || []);
    } catch (err) {
      console.error('Failed to load connected repositories:', err);
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

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalRepos = repos.length;
  const avgScore =
    totalRepos > 0
      ? Math.round(
          repos.reduce((acc, r) => acc + (r.securityScore ?? 100), 0) / totalRepos,
        )
      : 100;

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading Security Overview..."
        subMessage="Connecting to RepoLens defense telemetry"
      />
    );
  }

  return (
    <AppShell user={user} onLogout={logout} fullBleedTop>
      <div className="space-y-12">
        {/* 1. BRIGHT LIGHT FULL-SCREEN HERO (Uses global wireframe grid behind) */}
        <section className="relative min-h-screen min-h-[100dvh] flex flex-col justify-center pb-14 pt-24 text-slate-900">
          <div className="relative z-10 w-full">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              {/* Left 7 Cols: Headline, Pills & CTAs with Smooth Text Transitions */}
              <div className="lg:col-span-7">
                <div className="animate-text-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/85 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Continuous Repository Security Engine</span>
                </div>

                <h1 className="animate-text-delay-1 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
                  Automated Code Security &amp;{' '}
                  <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Vulnerability Remediation.
                  </span>
                </h1>

                <p className="animate-text-delay-2 mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  RepoLens connects directly to your GitHub repositories via verified webhooks.
                  Findings are isolated per project—select any repository below to inspect file-cited
                  lines, dependencies, and 1-click PR fixes.
                </p>

                {/* Soft Feature Badges */}
                <div className="animate-text-delay-2 mt-6 flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/85 px-3.5 py-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                    <Terminal className="h-3.5 w-3.5 text-blue-600" />
                    Pattern &amp; Entropy Scan
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/85 px-3.5 py-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                    <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                    Zero-Exposure Masking
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/85 px-3.5 py-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    OSV.dev + CycloneDX SBOM
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/85 px-3.5 py-1.5 text-slate-700 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    1-Click GitHub PR Fixes
                  </span>
                </div>

                {/* Matching Soft Hero Actions */}
                <div className="animate-text-delay-3 mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/repos/connect"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Connect Repository</span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </Link>
                  <button
                    onClick={() => loadRepos()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-white transition-all"
                  >
                    <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh Telemetry</span>
                  </button>
                </div>
              </div>

              {/* Right 5 Cols: Interactive Rotatable 3D React Code Cube */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <CodeCube3D className="w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. STATS OVERVIEW CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-uniform rounded-3xl p-5">
            <span className="text-xs font-medium text-slate-500">
              Connected Repositories
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {totalRepos}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {totalRepos === 1 ? '1 active' : `${totalRepos} active`}
              </span>
            </div>
          </div>

          <div className="card-uniform rounded-3xl p-5">
            <span className="text-xs font-medium text-slate-500">
              Average Security Health
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {avgScore}/100
              </span>
              <span
                className={`text-xs font-semibold ${
                  avgScore >= 80 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {avgScore >= 80 ? 'Passing' : 'Action Required'}
              </span>
            </div>
          </div>

          <div className="card-uniform rounded-3xl p-5">
            <span className="text-xs font-medium text-slate-500">
              CI/CD Webhook Defense
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                Active
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                HMAC-SHA256
              </span>
            </div>
          </div>

          <div className="card-uniform rounded-3xl p-5">
            <span className="text-xs font-medium text-slate-500">
              Auto-Remediation
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Ready
              </span>
              <span className="text-xs text-slate-500 font-mono">1-Click PR API</span>
            </div>
          </div>
        </section>

        {/* 3. MONITORED REPOSITORIES */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <FolderGit2 className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Monitored Repositories
                </h2>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700">
                  {totalRepos} Total
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Each repository has its own isolated audit. Click <span className="text-slate-900 font-semibold">Open Audit →</span> to view file-cited code lines, dependencies, and fix PRs.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-60 w-full rounded-3xl bg-slate-200/70" />
              ))}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="card-uniform rounded-3xl p-12 text-center">
              <GitBranch className="mx-auto h-9 w-9 text-slate-400 mb-3" />
              <p className="text-base font-bold text-slate-900">No repositories found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No repositories match your search filter.'
                  : 'Connect your GitHub repository to enable continuous security audits and automated fix PRs.'}
              </p>
              {!searchQuery && (
                <Link href="/repos/connect" className="inline-block mt-5">
                  <button className="liquid-btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Connect Repository</span>
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRepos.map((repo) => {
                const score = repo.securityScore ?? 85;
                const isScanning = scanningRepoId === repo.id;

                return (
                  <div
                    key={repo.id}
                    className="card-uniform group flex flex-col justify-between rounded-3xl p-6"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/repos/${repo.id}`}
                            className="font-bold text-base text-slate-900 hover:text-blue-600 truncate block transition-colors"
                          >
                            {repo.fullName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="font-mono text-[11px] text-slate-500">
                              {repo.defaultBranch || 'main'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                              {repo.isPrivate ? 'Private' : 'Public'}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`rounded-xl px-3 py-1.5 text-xs font-mono font-bold shrink-0 border ${
                            score >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : score >= 60
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {score}/100
                        </div>
                      </div>

                      <div className="mt-5 mb-3.5">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              score >= 80
                                ? 'bg-emerald-500'
                                : score >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(8, score)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mt-4">
                        <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 font-bold text-rose-700">
                          {repo.counts.critical} CRIT
                        </span>
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                          {repo.counts.high} HIGH
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                          {repo.counts.medium} MED
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">
                          {repo.counts.low} LOW
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={(e) => handleTriggerScan(repo.id, e)}
                        disabled={isScanning}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                      >
                        <Play className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-blue-600' : ''}`} />
                        <span>{isScanning ? 'Scanning...' : 'Run Scan'}</span>
                      </button>

                      <Link
                        href={`/repos/${repo.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <span>Open Audit</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. SECURITY ARCHITECTURE CAPABILITIES */}
        <section className="border-t border-slate-200 pt-8">
          <div className="mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Repository Security Capabilities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-pass static analysis and dependency intelligence protecting your connected repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="card-uniform rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900">
                <Terminal className="h-4 w-4 text-blue-600" />
                Pattern Code Analysis
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Detects dynamic arguments in <code className="text-slate-800 bg-slate-100 px-1 rounded">child_process.exec()</code>, <code className="text-slate-800 bg-slate-100 px-1 rounded">eval()</code>, and missing Helmet headers.
              </p>
            </div>

            <div className="card-uniform rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Smart Secret Detection
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Detects API keys and database strings. Automatically ignores dummy template examples like <code className="text-slate-800 bg-slate-100 px-1 rounded">&lt;username&gt;:&lt;password&gt;</code>.
              </p>
            </div>

            <div className="card-uniform rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900">
                <Package className="h-4 w-4 text-blue-600" />
                Dependencies &amp; SBOM
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Batch queries Google Open Source Vulnerabilities database with an in-memory cache and exports CycloneDX v1.5 JSON SBOMs.
              </p>
            </div>

            <div className="card-uniform rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2 font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-blue-600" />
                1-Click GitHub PR Fixes
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Uses the GitHub Git Data API to branch, apply safe JSON replacements, and open ready-to-merge Pull Requests.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
