import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from '@/lib/router';
import {
  Sparkles,
  GitPullRequest,
  Check,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
} from 'lucide-react';
import type { ConnectedRepo, FindingItem, FindingStatus, Severity } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export default function FindingsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('all');
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [typeFilter] = useState<'all' | 'secret' | 'dependency' | 'code_pattern'>('all');
  const [statusFilter, setStatusFilter] = useState<FindingStatus>('open');
  const [creatingPrId, setCreatingPrId] = useState<string | null>(null);
  const [prSuccessUrl, setPrSuccessUrl] = useState<{ id: string; url: string } | null>(null);

  const repoNameById = useMemo(
    () => new Map(repos.map((r) => [r.id, r.fullName])),
    [repos],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reposRes = await apiFetch<{ repos: ConnectedRepo[] }>('/api/repos');
      const loadedRepos = reposRes.repos || [];
      setRepos(loadedRepos);

      // Collect latest scan findings across all connected repos in parallel
      const scanLists = await Promise.all(
        loadedRepos.map(async (repo) => {
          try {
            const scansRes = await apiFetch<{ scans: Array<{ id: string }> }>(`/api/repos/${repo.id}/scans`);
            const latestScanId = scansRes.scans?.[0]?.id;
            if (!latestScanId) return [];
            const scanDetail = await apiFetch<{ findings: FindingItem[] }>(`/api/scans/${latestScanId}`);
            return scanDetail.findings || [];
          } catch {
            return [];
          }
        }),
      );
      setFindings(scanLists.flat());
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to Load Findings',
        description: err instanceof Error ? err.message : 'Unable to fetch security findings.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleCreatePr = async (findingId: string) => {
    setCreatingPrId(findingId);
    setPrSuccessUrl(null);
    try {
      const res = await apiFetch<{ prUrl: string; prNumber?: number }>(`/api/findings/${findingId}/create-pr`, {
        method: 'POST',
      });
      setPrSuccessUrl({ id: findingId, url: res.prUrl });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, prUrl: res.prUrl } : f)),
      );
      toast({
        variant: 'success',
        title: res.prNumber ? `Pull Request #${res.prNumber} Created` : 'Fix Pull Request Created',
        description: 'Next step: Review and merge the PR on GitHub, then re-scan the repository to update your security score.',
        duration: 9000,
        action: {
          label: 'View PR on GitHub',
          href: res.prUrl,
        },
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Pull Request Creation Failed',
        description: err instanceof Error ? err.message : 'Unable to open remediation PR on GitHub.',
      });
    } finally {
      setCreatingPrId(null);
    }
  };

  const handleUpdateStatus = async (findingId: string, newStatus: FindingStatus) => {
    try {
      await apiFetch(`/api/findings/${findingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f)),
      );
      toast({
        variant: newStatus === 'resolved' ? 'success' : 'info',
        title: newStatus === 'resolved' ? 'Finding Marked as Resolved' : 'Finding Reopened',
        description:
          newStatus === 'resolved'
            ? 'Excluded from open risk counts. You can reopen it anytime using the status filter.'
            : 'Finding moved back to open status.',
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Status Update Failed',
        description: err instanceof Error ? err.message : 'Unable to update finding status.',
      });
    }
  };

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedRepoId !== 'all' && f.repoId !== selectedRepoId) return false;
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      return true;
    });
  }, [findings, selectedRepoId, severityFilter, typeFilter, statusFilter]);

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading Security Findings..."
        subMessage="Aggregating vulnerability reports across monitored repos"
      />
    );
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="animate-text-reveal">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Vulnerabilities &amp; Findings
            </h1>
            <p className="text-xs text-slate-500 mt-1 animate-text-delay-1">
              Active security findings with AST explanations and 1-click Pull Request remediation.
            </p>
          </div>

          {/* Repo selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Repository:</span>
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#df3407] focus:outline-none shadow-sm"
            >
              <option value="all">All Connected Repositories</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3">
          {/* Severity filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 mr-1">Severity:</span>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  severityFilter === sev
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 mr-1">Status:</span>
            {(['open', 'resolved', 'ignored'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-3xl bg-slate-200" />
            ))}
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="card-uniform rounded-3xl border-dashed p-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Zero vulnerabilities found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No matching findings detected for the selected filters. Your repositories are in excellent security posture!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((finding) => {
              const isCrit = finding.severity === 'critical';
              const isHigh = finding.severity === 'high';
              const isCreatingThisPr = creatingPrId === finding.id;
              const hasPrLink = prSuccessUrl?.id === finding.id ? prSuccessUrl.url : finding.prUrl;

              return (
                <div
                  key={finding.id}
                  className="card-uniform rounded-3xl p-5 sm:p-6"
                >
                  {/* Top Bar: Severity Badge + Title + Action */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          isCrit
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : isHigh
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {finding.severity}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{finding.title}</h3>
                          {repoNameById.get(finding.repoId) && (
                            <Link
                              href={`/repos/${finding.repoId}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors"
                            >
                              <FolderGit2 className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                              <span>{repoNameById.get(finding.repoId)}</span>
                            </Link>
                          )}
                        </div>
                        <p className="font-mono text-xs text-slate-500 mt-1">
                          {finding.filePath}
                          {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* PR / Action Buttons */}
                    <div className="flex items-center gap-2">
                      {hasPrLink ? (
                        <a
                          href={hasPrLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <GitPullRequest className="h-3.5 w-3.5" />
                          <span>View PR on GitHub</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreatePr(finding.id)}
                          disabled={isCreatingThisPr || !finding.aiSuggestedFix}
                          className="liquid-btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-1 text-xs font-semibold disabled:opacity-40"
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${isCreatingThisPr ? 'animate-spin' : ''}`} />
                          <span>{isCreatingThisPr ? 'Creating PR...' : '1-Click Fix PR'}</span>
                        </button>
                      )}

                      {/* Quick Status toggle */}
                      <button
                        onClick={() => handleUpdateStatus(finding.id, finding.status === 'resolved' ? 'open' : 'resolved')}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white/[0.08] transition-colors"
                        title={finding.status === 'resolved' ? 'Reopen' : 'Mark as Resolved'}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plain-English Explanation */}
                  {finding.aiExplanation && (
                    <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900 mr-1.5">Remediation Note:</span>
                      {finding.aiExplanation}
                    </div>
                  )}

                  {/* Code Snippet Previews */}
                  <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2 text-xs font-mono">
                    {/* Vulnerable snippet */}
                    {finding.maskedPreview && (
                      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                        <span className="text-[10px] font-sans font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                          Vulnerable Snippet
                        </span>
                        <code className="text-rose-800 block overflow-x-auto whitespace-pre-wrap text-[11px]">
                          {finding.maskedPreview}
                        </code>
                      </div>
                    )}

                    {/* AI safe replacement */}
                    {finding.aiSuggestedFix && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <span className="text-[10px] font-sans font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                          Patched Replacement
                        </span>
                        <code className="text-emerald-800 block overflow-x-auto whitespace-pre-wrap text-[11px]">
                          {finding.aiSuggestedFix}
                        </code>
                      </div>
                    )}
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
