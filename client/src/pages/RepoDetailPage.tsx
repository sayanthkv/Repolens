import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams, Link } from '@/lib/router';
import { io } from 'socket.io-client';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  Play,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  ExternalLink,
  X,
  Check,
  EyeOff,
  Loader2,
  ShieldAlert,
  Copy,
  Activity,
  ListFilter,
  FileCode2,
  MessageSquareCode,
  Clock,
  Sparkles,
  RefreshCw,
  KeyRound,
  Route as RouteIcon,
  Database,
  ChevronRight,
  HelpCircle,
  Code2,
  FileWarning,
  TrendingDown,
  GitPullRequest,
  Download,
  Search,
} from 'lucide-react';
import type {
  ConnectedRepo,
  FindingItem,
  FindingStatus,
  LicenseSummary,
  RepoSummaryRecord,
  RepoSummaryContent,
  ScanSummaryItem,
  Severity,
} from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { ScoreRing } from '@/components/score-ring';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import { AskRepoPanel } from '@/components/ask-repo-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#64748b',
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function getFindingTypeInfo(type: string) {
  switch (type) {
    case 'secret':
      return {
        label: 'Leaked Secret',
        icon: '🔑',
        badgeClass: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
        helpText: 'Hardcoded API key, private token, or password found in source code.',
      };
    case 'dependency':
      return {
        label: 'Vulnerable Package',
        icon: '📦',
        badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
        helpText: 'Known vulnerability (CVE) reported in an installed npm dependency.',
      };
    case 'code_pattern':
    default:
      return {
        label: 'Unsafe Code Pattern',
        icon: '🛡️',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        helpText: 'Dangerous programming practice that could allow command injection, XSS, or data leaks.',
      };
  }
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const configs: Record<Severity, { label: string; className: string; icon: typeof AlertOctagon }> = {
    critical: {
      label: 'CRITICAL',
      className: 'bg-rose-500/20 text-rose-700 border-rose-500/40 font-bold tracking-wide',
      icon: AlertOctagon,
    },
    high: {
      label: 'HIGH',
      className: 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold tracking-wide',
      icon: AlertTriangle,
    },
    medium: {
      label: 'MEDIUM',
      className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-semibold',
      icon: Info,
    },
    low: {
      label: 'LOW',
      className: 'bg-slate-500/20 text-slate-300 border-slate-500/40 font-medium',
      icon: Info,
    },
  };

  const config = configs[severity] ?? configs.low;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px]',
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export default function RepoDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const repoId = params?.id;

  const { user, loading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });

  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'summary' | 'compliance' | 'ask' | 'history'>('findings');
  const [repo, setRepo] = useState<ConnectedRepo | null>(null);
  const [scans, setScans] = useState<ScanSummaryItem[]>([]);
  const [activeScan, setActiveScan] = useState<ScanSummaryItem | null>(null);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [scanStage, setScanStage] = useState('');
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [summary, setSummary] = useState<RepoSummaryRecord | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [sortBy, setSortBy] = useState<'severity' | 'filePath'>('severity');
  const [onlyRegressions, setOnlyRegressions] = useState(false);

  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null);
  const [updatingFindingId, setUpdatingFindingId] = useState<string | null>(null);
  const [creatingPrFindingId, setCreatingPrFindingId] = useState<string | null>(null);
  const [copiedFix, setCopiedFix] = useState(false);

  const [licenseData, setLicenseData] = useState<LicenseSummary | null>(null);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [licenseSearch, setLicenseSearch] = useState('');

  const autoScanStartedRef = useRef(false);

  const loadScanDetails = useCallback(async (scanId: string) => {
    const res = await apiFetch<{ scan: ScanSummaryItem; findings: FindingItem[] }>(`/api/scans/${scanId}`);
    setActiveScan(res.scan);
    setFindings(res.findings);
  }, []);

  const loadRepoData = useCallback(async () => {
    if (!repoId) return;
    setLoadingRepo(true);
    setError(null);
    try {
      const [repoRes, scansRes, summaryRes] = await Promise.all([
        apiFetch<{ repo: ConnectedRepo }>(`/api/repos/${repoId}`),
        apiFetch<{ scans: ScanSummaryItem[] }>(`/api/repos/${repoId}/scans`),
        apiFetch<{ summary: RepoSummaryRecord | null }>(`/api/repos/${repoId}/summary`),
      ]);
      setRepo(repoRes.repo);
      setScans(scansRes.scans);
      setSummary(summaryRes.summary);

      const latest = scansRes.scans[0] ?? null;
      setActiveScan(latest);
      if (latest) {
        await loadScanDetails(latest.id);
      } else {
        setFindings([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
    } finally {
      setLoadingRepo(false);
    }
  }, [repoId, loadScanDetails]);

  useEffect(() => {
    if (user && repoId) {
      loadRepoData();
    }
  }, [user, repoId, loadRepoData]);

  const handleGenerateSummary = useCallback(
    async (force = false) => {
      if (!repoId) return;
      setGeneratingSummary(true);
      setSummaryError(null);
      try {
        const res = await apiFetch<{ summary: RepoSummaryRecord }>(
          `/api/repos/${repoId}/summary${force ? '?force=true' : ''}`,
          { method: 'POST' },
        );
        setSummary(res.summary);
      } catch (err) {
        setSummaryError(err instanceof Error ? err.message : 'Failed to generate repository summary');
      } finally {
        setGeneratingSummary(false);
      }
    },
    [repoId],
  );

  const handleTriggerScan = useCallback(async () => {
    if (!repoId) return;
    setTriggeringScan(true);
    setScanStage('Queuing scan...');
    try {
      const { scan } = await apiFetch<{ scan: ScanSummaryItem }>(`/api/repos/${repoId}/scans`, {
        method: 'POST',
      });
      setActiveScan(scan);
      setScans((prev) => [scan, ...prev.filter((s) => s.id !== scan.id)]);
      toast({
        variant: 'info',
        title: 'Security Scan Started',
        description: 'Analyzing secrets, dependencies, and code patterns. Progress updates live below.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start scan';
      setError(msg);
      toast({
        variant: 'error',
        title: 'Failed to Start Scan',
        description: msg,
      });
    } finally {
      setTriggeringScan(false);
    }
  }, [repoId, toast]);

  useEffect(() => {
    if (
      !loadingRepo &&
      repo &&
      searchParams.get('autostart') === '1' &&
      !autoScanStartedRef.current &&
      activeScan?.status !== 'running' &&
      activeScan?.status !== 'queued'
    ) {
      autoScanStartedRef.current = true;
      handleTriggerScan();
    }
  }, [loadingRepo, repo, searchParams, activeScan, handleTriggerScan]);

  useEffect(() => {
    if (!user || !repoId) return;
    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('scan:progress', (data: { scanId: string; repoId: string; progress: number; stage: string }) => {
      if (data.repoId === repoId) {
        setScanStage(data.stage);
        setActiveScan((curr) => (curr && curr.id === data.scanId ? { ...curr, status: 'running', progress: data.progress } : curr));
      }
    });

    socket.on('scan:completed', async (data: { scanId: string; repoId: string }) => {
      if (data.repoId === repoId) {
        setScanStage('');
        await loadRepoData();
        toast({
          variant: 'success',
          title: 'Security Scan Complete',
          description: 'Review any open findings below or open the AI Architecture Summary tab.',
        });
      }
    });

    socket.on('scan:failed', (data: { scanId: string; repoId: string; error: string }) => {
      if (data.repoId === repoId) {
        setScanStage('');
        setActiveScan((curr) => (curr && curr.id === data.scanId ? { ...curr, status: 'failed', error: data.error } : curr));
        toast({
          variant: 'error',
          title: 'Security Scan Failed',
          description: data.error || 'An error occurred while scanning the repository.',
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, repoId, loadRepoData, toast]);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedFinding(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleUpdateFindingStatus(findingId: string, status: FindingStatus) {
    setUpdatingFindingId(findingId);
    try {
      const res = await apiFetch<{
        finding: FindingItem;
        securityScore: number;
        counts: { critical: number; high: number; medium: number; low: number };
      }>(`/api/findings/${findingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      setFindings((prev) => prev.map((f) => (f.id === findingId ? res.finding : f)));
      setSelectedFinding((prev) => (prev && prev.id === findingId ? res.finding : prev));
      setRepo((prev) => (prev ? { ...prev, securityScore: res.securityScore, counts: res.counts } : prev));
      setActiveScan((prev) => (prev ? { ...prev, securityScore: res.securityScore, counts: res.counts } : prev));
      setScans((prev) =>
        prev.map((s) => (activeScan && s.id === activeScan.id ? { ...s, securityScore: res.securityScore, counts: res.counts } : s)),
      );
      toast({
        variant: status === 'resolved' ? 'success' : 'info',
        title:
          status === 'resolved'
            ? 'Finding Marked as Resolved'
            : status === 'ignored'
              ? 'Finding Ignored'
              : 'Finding Reopened',
        description: `Security score updated to ${res.securityScore}/100.`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Status Update Failed',
        description: err instanceof Error ? err.message : 'Unable to update finding status.',
      });
    } finally {
      setUpdatingFindingId(null);
    }
  }

  async function handleDisconnectRepo() {
    if (!repo) return;
    if (!window.confirm(`Disconnect ${repo.fullName} from RepoLens?`)) return;
    setDisconnecting(true);
    try {
      await apiFetch(`/api/repos/${repo.id}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect repository');
      setDisconnecting(false);
    }
  }

  async function handleCreateFixPr(finding: FindingItem) {
    if (!finding.aiSuggestedFix) return;
    setCreatingPrFindingId(finding.id);
    try {
      const res = await apiFetch<{
        success: boolean;
        prUrl: string;
        prNumber: number;
        branchName: string;
      }>(`/api/findings/${finding.id}/create-pr`, {
        method: 'POST',
      });
      const updated = { ...finding, prUrl: res.prUrl };
      setFindings((prev) => prev.map((f) => (f.id === finding.id ? updated : f)));
      setSelectedFinding(updated);
      toast({
        variant: 'success',
        title: `Pull Request #${res.prNumber} Created`,
        description: `Branch ${res.branchName} is ready. Next step: review and merge the PR on GitHub, then run a new scan to update your score.`,
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
        description: err instanceof Error ? err.message : 'Failed to create Pull Request',
      });
    } finally {
      setCreatingPrFindingId(null);
    }
  }

  const loadLicenses = useCallback(async (scanId: string) => {
    setLoadingLicenses(true);
    try {
      const res = await apiFetch<LicenseSummary>(`/api/scans/${scanId}/licenses`);
      setLicenseData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'compliance' && activeScan && !licenseData) {
      loadLicenses(activeScan.id);
    }
  }, [activeTab, activeScan, licenseData, loadLicenses]);

  const filteredFindings = useMemo(() => {
    return findings
      .filter((f) => (severityFilter === 'all' ? true : f.severity === severityFilter))
      .filter((f) => (typeFilter === 'all' ? true : f.type === typeFilter))
      .filter((f) => (statusFilter === 'all' ? true : f.status === statusFilter))
      .filter((f) => (!onlyRegressions ? true : Boolean(f.isRegressionNew)))
      .sort((a, b) => {
        if (sortBy === 'severity') {
          return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        }
        return a.filePath.localeCompare(b.filePath);
      });
  }, [findings, severityFilter, typeFilter, statusFilter, sortBy, onlyRegressions]);

  const severityChartData = useMemo(() => {
    if (!repo) return [];
    return [
      { name: 'Critical', value: repo.counts.critical, color: SEVERITY_COLORS.critical },
      { name: 'High', value: repo.counts.high, color: SEVERITY_COLORS.high },
      { name: 'Medium', value: repo.counts.medium, color: SEVERITY_COLORS.medium },
      { name: 'Low', value: repo.counts.low, color: SEVERITY_COLORS.low },
    ].filter((item) => item.value > 0);
  }, [repo]);

  const historyTrendData = useMemo(() => {
    return [...scans]
      .filter((s) => s.status === 'completed' && typeof s.securityScore === 'number')
      .reverse()
      .map((s) => ({
        date: new Date(s.finishedAt ?? s.startedAt ?? Date.now()).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        sha: s.commitSha.slice(0, 7),
        score: s.securityScore,
      }));
  }, [scans]);

  if (loading || !user) {
    return (
      <HypnoticLoader
        message="Authenticating Session..."
        subMessage="Connecting to RepoLens secure enclave"
      />
    );
  }

  const isScanning =
    triggeringScan || activeScan?.status === 'queued' || activeScan?.status === 'running';

  const tabList = [
    {
      id: 'findings' as const,
      label: 'Security Issues',
      icon: ListFilter,
      count: findings.filter((f) => f.status === 'open').length,
      badgeColor: 'bg-rose-500/20 text-rose-700',
    },
    { id: 'overview' as const, label: 'Overview & Stats', icon: Activity },
    { id: 'summary' as const, label: 'AI Architecture Summary', icon: Sparkles },
    { id: 'compliance' as const, label: 'Compliance & SBOM', icon: FileCode2 },
    { id: 'ask' as const, label: 'Ask Repo AI', icon: MessageSquareCode },
    { id: 'history' as const, label: 'Scan History', icon: Clock, count: scans.length },
  ];

  const summaryContent: RepoSummaryContent | null = summary?.content ?? null;

  // Human-friendly score text
  const scoreNumber = repo?.securityScore ?? null;
  const scoreVerdict =
    scoreNumber === null
      ? { text: 'Not Scanned Yet', color: 'text-muted-foreground', bg: 'bg-muted/40' }
      : scoreNumber >= 80
        ? { text: 'Healthy Security Posture', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
        : scoreNumber >= 60
          ? { text: 'Moderate Risk — Attention Recommended', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
          : { text: 'Action Required — Critical Vulnerabilities Detected', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };

  return (
    <AppShell user={user} onLogout={logout}>
      {/* Top Breadcrumb */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Repositories
        </Link>
      </div>

      {loadingRepo ? (
        <HypnoticLoader
          message="Loading Repository Security Audit..."
          subMessage="Fetching AST findings, dependencies, and git history"
        />
      ) : error || !repo ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" aria-hidden="true" />
            <p className="text-base font-semibold">{error ?? 'Repository not found'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Make sure you have authorized access to this repository.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadRepoData}>
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Repository Header Card */}
          <div className="liquid-card rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              {/* Left: Score + Info */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <ScoreRing score={repo.securityScore} size={76} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">
                      {repo.fullName}
                    </h1>
                    <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      branch: {repo.defaultBranch}
                    </span>
                    {repo.lastScannedSha && (
                      <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        commit: {repo.lastScannedSha.slice(0, 7)}
                      </span>
                    )}
                  </div>

                  {/* Verdict Banner */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', scoreVerdict.bg, scoreVerdict.color)}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {scoreVerdict.text}
                    </span>

                    {/* Counts pills */}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {repo.counts.critical > 0 && (
                        <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-rose-700">
                          {repo.counts.critical} Critical
                        </span>
                      )}
                      {repo.counts.high > 0 && (
                        <span className="rounded-md bg-orange-500/20 px-2 py-0.5 text-orange-300">
                          {repo.counts.high} High
                        </span>
                      )}
                      {repo.counts.medium > 0 && (
                        <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-yellow-300">
                          {repo.counts.medium} Medium
                        </span>
                      )}
                      {repo.counts.low > 0 && (
                        <span className="rounded-md bg-slate-500/20 px-2 py-0.5 text-slate-300">
                          {repo.counts.low} Low
                        </span>
                      )}
                      {repo.counts.critical === 0 && repo.counts.high === 0 && repo.counts.medium === 0 && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-700">
                          No Critical Issues
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  disabled={isScanning}
                  onClick={handleTriggerScan}
                  className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      Run Security Scan
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disconnecting}
                  onClick={handleDisconnectRepo}
                  className="border-border text-muted-foreground hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Live Progress Bar */}
            {isScanning && activeScan && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {scanStage || 'Analyzing repository files for secrets, CVEs, and insecure code...'}
                  </span>
                  <span className="font-mono font-semibold text-primary">{activeScan.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.max(8, activeScan.progress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            role="tablist"
            aria-label="Repository sections"
            className="flex gap-2 border-b border-border/80 pb-px"
          >
            {tabList.map((t) => {
              const Icon = t.icon;
              const selected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                  {typeof t.count === 'number' && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold',
                        selected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: FINDINGS (Default view - Human-friendly Cards) */}
          {activeTab === 'findings' && (
            <div className="space-y-4">
              {/* SECURITY REGRESSION ALERT BANNER */}
              {activeScan?.isRegression && typeof activeScan.scoreDelta === 'number' && activeScan.scoreDelta < 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-800">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-700">
                        Security Regression Detected in commit <code className="font-mono text-xs">{activeScan.commitSha.slice(0, 7)}</code>
                      </h4>
                      <p className="mt-0.5 text-xs text-rose-700">
                        Security score decreased by <strong>{Math.abs(activeScan.scoreDelta)} points</strong> (from {activeScan.previousScore ?? '—'} to {activeScan.securityScore}).
                        {findings.filter((f) => f.isRegressionNew).length > 0 &&
                          ` ${findings.filter((f) => f.isRegressionNew).length} new security issue(s) were introduced in this commit.`}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOnlyRegressions((prev) => !prev)}
                    className={cn(
                      'text-xs shrink-0 border-rose-500/40 text-rose-800 hover:bg-rose-500/20',
                      onlyRegressions && 'bg-rose-500/30 font-semibold',
                    )}
                  >
                    {onlyRegressions ? 'Show All Issues' : 'Filter New Regressions Only'}
                  </Button>
                </div>
              )}

              {/* Filter and Control Bar */}
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Showing:</span>
                  <span>{filteredFindings.length} issue{filteredFindings.length === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span>Click any card to view safe code replacement</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter by severity"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <select
                    aria-label="Filter by category"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Categories</option>
                    <option value="secret">🔑 Leaked Secrets</option>
                    <option value="dependency">📦 Vulnerable Packages</option>
                    <option value="code_pattern">🛡️ Code Security Risks</option>
                  </select>

                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="open">Status: Open</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="ignored">Status: Ignored</option>
                    <option value="all">All Statuses</option>
                  </select>

                  <select
                    aria-label="Sort findings"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'severity' | 'filePath')}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="severity">Sort by Highest Severity</option>
                    <option value="filePath">Sort by File Name</option>
                  </select>
                </div>
              </div>

              {/* Finding Cards List */}
              {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                  <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <p className="text-base font-semibold">No Scans Completed Yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Click "Run Security Scan" above to analyze your repository.</p>
                </div>
              ) : filteredFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-card/40 py-16 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" aria-hidden="true" />
                  <p className="text-base font-semibold">No Issues Found Matching Filter</p>
                  <p className="mt-1 text-xs text-muted-foreground">All issues in this view are resolved or filtered out.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredFindings.map((f) => {
                    const typeInfo = getFindingTypeInfo(f.type);
                    const isSelected = selectedFinding?.id === f.id;

                    return (
                      <div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedFinding(f);
                          setCopiedFix(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedFinding(f);
                            setCopiedFix(false);
                          }
                        }}
                        className={cn(
                          'group relative flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center cursor-pointer',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary'
                            : 'border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40 shadow-xs',
                        )}
                      >
                        {/* Left Side: Badges + Description */}
                        <div className="flex flex-1 items-start gap-3.5">
                          <div className="pt-0.5">
                            <SeverityBadge severity={f.severity} />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                                {f.title}
                              </span>
                              <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium', typeInfo.badgeClass)}>
                                <span>{typeInfo.icon}</span>
                                {typeInfo.label}
                              </span>
                            </div>

                            {/* Location Pill & Code Preview */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                                📄 {f.filePath}:{f.lineNumber}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground truncate max-w-lg bg-background/80 px-2 py-0.5 rounded border border-border/40">
                                {f.maskedPreview}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Status + Inspect CTA */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                              f.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30'
                                : f.status === 'ignored'
                                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                  : 'bg-primary/10 text-primary border border-primary/20',
                            )}
                          >
                            {f.status}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                            Inspect Fix
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Security Health Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                  <ScoreRing score={repo.securityScore} size={130} />
                  <p className="mt-4 text-xs text-muted-foreground max-w-xs">
                    {repo.securityScore === null
                      ? 'Run a scan to evaluate your repository vulnerabilities.'
                      : repo.securityScore >= 80
                        ? 'Great security posture! Minimal high or critical issues found.'
                        : repo.securityScore >= 60
                          ? 'Moderate vulnerability score. Address high-priority issues to improve safety.'
                          : 'Immediate attention needed! Fix critical issues to prevent code compromise.'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Issues Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="flex h-56 items-center justify-center">
                  {severityChartData.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Zero open security issues detected.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={48}
                          outerRadius={76}
                          paddingAngle={3}
                        >
                          {severityChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Repository Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs text-muted-foreground">Hardcoded Secrets</span>
                    <span className="font-mono text-xs font-semibold">
                      {findings.filter((f) => f.status === 'open' && f.type === 'secret').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs text-muted-foreground">Vulnerable Dependencies</span>
                    <span className="font-mono text-xs font-semibold">
                      {findings.filter((f) => f.status === 'open' && f.type === 'dependency').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <span className="text-xs text-muted-foreground">Unsafe Code Patterns</span>
                    <span className="font-mono text-xs font-semibold">
                      {findings.filter((f) => f.status === 'open' && f.type === 'code_pattern').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Scans Run</span>
                    <span className="font-mono text-xs font-semibold">{scans.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: AI ARCHITECTURE SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {generatingSummary ? (
                <Card className="border-border/80 bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">Generating Plain-English Architecture Summary...</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Analyzing code files, route patterns, and constructing a Mermaid architecture diagram.
                    </p>
                  </CardContent>
                </Card>
              ) : summaryError ? (
                <Card className="border-border/80 bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" aria-hidden="true" />
                    <p className="text-sm font-semibold">Failed to Generate Summary</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{summaryError}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => handleGenerateSummary(true)}>
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : !summaryContent || !summary ? (
                <Card className="border-border/80 bg-card">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Sparkles className="mb-3 h-8 w-8 text-primary" aria-hidden="true" />
                    <h3 className="text-base font-semibold">Understand This Codebase in 60 Seconds</h3>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      Generates a clear architectural diagram, explains your auth approach, and outlines API routes and data models.
                    </p>
                    <Button className="mt-5" onClick={() => handleGenerateSummary(false)}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Generate AI Summary
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Commit: <strong className="font-mono text-foreground">{summary.commitSha.slice(0, 7)}</strong></span>
                      <span>•</span>
                      <span>{new Date(summary.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateSummary(true)}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Regenerate
                    </Button>
                  </div>

                  <Card className="border-border/80 bg-card">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Overview &amp; Tech Stack</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed text-foreground">{summaryContent.overview}</p>
                      <div className="flex flex-wrap gap-2">
                        {summaryContent.techStack.map((item) => (
                          <span key={item} className="rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs font-medium">
                            {item}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-card">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">System Architecture Diagram</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MermaidDiagram chart={summaryContent.mermaidDiagram} />
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="border-border/80 bg-card">
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Request Flow</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">{summaryContent.requestFlow}</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/80 bg-card">
                      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                        <CardTitle className="text-base font-semibold">Authentication Flow</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed text-muted-foreground">{summaryContent.authApproach}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="border-border/80 bg-card">
                      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                        <RouteIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                        <CardTitle className="text-base font-semibold">API Endpoints ({summaryContent.apiRoutes.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summaryContent.apiRoutes.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No HTTP routes detected.</p>
                        ) : (
                          <div className="divide-y divide-border/60">
                            {summaryContent.apiRoutes.map((r, i) => (
                              <div key={`${r.method}-${r.path}-${i}`} className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-[11px] font-bold">
                                    {r.method}
                                  </Badge>
                                  <span className="font-mono text-xs font-semibold">{r.path}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{r.purpose}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/80 bg-card">
                      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                        <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                        <CardTitle className="text-base font-semibold">Database Models ({summaryContent.dataModels.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summaryContent.dataModels.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No data models detected.</p>
                        ) : (
                          <div className="space-y-3">
                            {summaryContent.dataModels.map((m) => (
                              <div key={m.name} className="rounded-md border border-border/80 bg-muted/20 p-3">
                                <div className="font-mono text-xs font-bold text-foreground">{m.name}</div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {m.fields.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground border border-border/40"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3.5: COMPLIANCE & SBOM */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Software Bill of Materials (SBOM) &amp; Licenses</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Export industry-standard CycloneDX SBOM and verify open source license compliance across all dependencies.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`${API_BASE_URL}/api/scans/${activeScan?.id}/sbom?download=true`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground px-3.5 py-2 text-xs font-medium border border-border transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Download CycloneDX SBOM (JSON)
                  </a>
                </div>
              </div>

              {/* Compliance Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-border/80 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permissive Licenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">
                      {licenseData?.riskCounts.permissive ?? 0}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">MIT, Apache 2.0, BSD, ISC</p>
                  </CardContent>
                </Card>

                <Card className="border-border/80 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Copyleft / Restricted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-400">
                      {(licenseData?.riskCounts.copyleft ?? 0) + (licenseData?.riskCounts.weak_copyleft ?? 0)}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">GPL, LGPL, AGPL, MPL</p>
                  </CardContent>
                </Card>

                <Card className="border-border/80 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Compliance Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-xl font-bold uppercase",
                      licenseData?.overallRisk === 'high' ? 'text-rose-400' : licenseData?.overallRisk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {licenseData?.overallRisk ?? 'Low'} Risk
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Commercial usage compliance</p>
                  </CardContent>
                </Card>
              </div>

              {/* Dependencies List Table */}
              <Card className="border-border/80 bg-card">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <CardTitle className="text-sm font-semibold">Detected Dependencies ({licenseData?.licenses.length ?? 0})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search dependency..."
                      value={licenseSearch}
                      onChange={(e) => setLicenseSearch(e.target.value)}
                      className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingLicenses ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                      Analyzing dependencies and license terms...
                    </div>
                  ) : !licenseData || licenseData.licenses.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground">No npm dependencies detected in this scan.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Package Name</th>
                            <th className="px-4 py-3 font-semibold">Version</th>
                            <th className="px-4 py-3 font-semibold">License</th>
                            <th className="px-4 py-3 font-semibold">Classification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {licenseData.licenses
                            .filter((item) => !licenseSearch || item.name.toLowerCase().includes(licenseSearch.toLowerCase()) || item.license.toLowerCase().includes(licenseSearch.toLowerCase()))
                            .map((item, idx) => (
                              <tr key={`${item.name}-${idx}`} className="hover:bg-accent/40">
                                <td className="px-4 py-2.5 font-mono font-medium text-foreground">{item.name}</td>
                                <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.version}</td>
                                <td className="px-4 py-2.5 font-mono text-xs">{item.license}</td>
                                <td className="px-4 py-2.5">
                                  <span className={cn(
                                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                                    item.type === 'permissive' ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30' :
                                    item.type === 'copyleft' ? 'bg-rose-500/15 text-rose-700 border border-rose-500/30' :
                                    'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                                  )}>
                                    {item.type.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: ASK REPO AI */}
          {activeTab === 'ask' && (
            <AskRepoPanel
              repoId={repo.id}
              repoFullName={repo.fullName}
              defaultBranch={repo.defaultBranch}
            />
          )}

          {/* TAB 5: SCAN HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Security Score Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {historyTrendData.length < 2 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Run at least two scans to visualize score trends over time.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Audit History ({scans.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {scans.length === 0 ? (
                    <p className="py-10 text-center text-xs text-muted-foreground">No scans yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Commit</th>
                            <th className="px-4 py-3 font-medium">Trigger</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Score</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {scans.map((s) => (
                            <tr
                              key={s.id}
                              onClick={async () => {
                                await loadScanDetails(s.id);
                                setActiveTab('findings');
                              }}
                              className="cursor-pointer transition-colors hover:bg-accent/40"
                            >
                              <td className="px-4 py-3 font-mono text-xs">{s.commitSha.slice(0, 7)}</td>
                              <td className="px-4 py-3 capitalize">{s.trigger.replace('_', ' ')}</td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={s.status === 'completed' ? 'success' : 'secondary'}
                                  className="capitalize"
                                >
                                  {s.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs font-semibold">
                                {s.securityScore !== null ? `${s.securityScore} / 100` : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {s.finishedAt ? new Date(s.finishedAt).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* HUMAN-FRIENDLY CODE INSPECTOR DRAWER */}
          {selectedFinding &&
            repo &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="fixed inset-0 z-[60] flex justify-end bg-slate-900/35 backdrop-blur-sm transition-opacity duration-300"
                role="dialog"
                aria-modal="true"
                aria-labelledby="finding-drawer-title"
                onClick={() => setSelectedFinding(null)}
              >
                <div
                  className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200/90 bg-white/95 text-slate-900 backdrop-blur-2xl shadow-[0_24px_70px_rgba(15,23,42,0.18)] animate-in slide-in-from-right duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="border-b border-slate-200/80 bg-slate-50/75 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={selectedFinding.severity} />
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', getFindingTypeInfo(selectedFinding.type).badgeClass)}>
                            {getFindingTypeInfo(selectedFinding.type).icon} {getFindingTypeInfo(selectedFinding.type).label}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {selectedFinding.ruleId}
                          </span>
                        </div>
                        <h2 id="finding-drawer-title" className="text-lg font-bold text-slate-900">
                          {selectedFinding.title}
                        </h2>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close inspector"
                        onClick={() => setSelectedFinding(null)}
                        className="rounded-full text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Location Bar */}
                    <div className="mt-3.5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-xs">
                      <span className="flex items-center gap-1.5 font-mono text-slate-600">
                        <FileWarning className="h-4 w-4 text-blue-600" />
                        <strong className="text-slate-900">{selectedFinding.filePath}</strong> • Line {selectedFinding.lineNumber}
                      </span>
                      <a
                        href={`https://github.com/${repo.fullName}/blob/${activeScan?.commitSha ?? repo.defaultBranch}/${selectedFinding.filePath}#L${selectedFinding.lineNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View on GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 space-y-6 overflow-y-auto p-6 text-sm">
                    {/* Section 1: Plain-English Risk Explanation */}
                    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4">
                      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                        <HelpCircle className="h-4 w-4" />
                        Why This Is a Problem
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {selectedFinding.aiExplanation || selectedFinding.description}
                      </p>
                    </div>

                    {/* Section 2: Vulnerable Code in User's File */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                          <Code2 className="h-4 w-4" />
                          Vulnerable Code in Your File
                        </h3>
                        <span className="font-mono text-[11px] text-slate-500">Line {selectedFinding.lineNumber}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/75">
                        <pre className="overflow-x-auto p-4 font-mono text-xs text-rose-900 selection:bg-rose-200">
                          <code>{selectedFinding.maskedPreview}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Section 3: Recommended Solution / AI Suggested Fix */}
                    {selectedFinding.aiSuggestedFix && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Recommended Safe Fix
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedFinding.aiSuggestedFix ?? '');
                              setCopiedFix(true);
                              setTimeout(() => setCopiedFix(false), 2000);
                            }}
                            className="h-7 gap-1.5 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs"
                          >
                            {copiedFix ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy Fix
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/75">
                          <pre className="overflow-x-auto p-4 font-mono text-xs text-emerald-950 selection:bg-emerald-200">
                            <code>{selectedFinding.aiSuggestedFix}</code>
                          </pre>
                        </div>
                        <p className="text-xs text-slate-500">
                          Replace your vulnerable line with this safe implementation to eliminate this risk.
                        </p>

                        {/* Pull Request Action */}
                        {selectedFinding.prUrl ? (
                          <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs">
                            <span className="flex items-center gap-2 font-medium text-blue-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Fix Pull Request created on GitHub
                            </span>
                            <a
                              href={selectedFinding.prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                            >
                              View PR
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 p-3.5 text-xs">
                            <div>
                              <p className="font-semibold text-slate-900">AI Auto-Remediation</p>
                              <p className="text-[11px] text-slate-500">Create a branch and open a Pull Request with this safe fix.</p>
                            </div>
                            <Button
                              size="sm"
                              disabled={creatingPrFindingId === selectedFinding.id}
                              onClick={() => handleCreateFixPr(selectedFinding)}
                              className="h-8 gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:from-blue-500 hover:to-indigo-500"
                            >
                              {creatingPrFindingId === selectedFinding.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Opening PR...
                                </>
                              ) : (
                                <>
                                  <GitPullRequest className="h-3.5 w-3.5" />
                                  Open Fix PR
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Bar */}
                  <div className="border-t border-slate-200/80 bg-slate-50/85 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Current Status:</span>
                        <strong className="capitalize font-semibold text-slate-900">
                          {selectedFinding.status}
                        </strong>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingFindingId === selectedFinding.id || selectedFinding.status === 'ignored'}
                          onClick={() => handleUpdateFindingStatus(selectedFinding.id, 'ignored')}
                          className="rounded-full border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          Ignore / False Positive
                        </Button>

                        <Button
                          size="sm"
                          disabled={updatingFindingId === selectedFinding.id || selectedFinding.status === 'resolved'}
                          onClick={() => handleUpdateFindingStatus(selectedFinding.id, 'resolved')}
                          className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-medium shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark as Resolved
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </div>
      )}
    </AppShell>
  );
}
