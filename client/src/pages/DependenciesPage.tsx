import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  AlertTriangle,
  Package,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import type { ConnectedRepo, LicenseSummary } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { useToast } from '@/components/ui/toast';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export default function DependenciesPage() {
  const { toast } = useToast();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [latestScanId, setLatestScanId] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<LicenseSummary | null>(null);
  const [downloadingSbom, setDownloadingSbom] = useState(false);

  const loadRepos = useCallback(async () => {
    try {
      const res = await apiFetch<{ repos: ConnectedRepo[] }>('/api/repos');
      const loaded = res.repos || [];
      setRepos(loaded);
      if (loaded.length > 0 && loaded[0]) {
        setSelectedRepoId(loaded[0].id);
      }
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  }, []);

  const loadRepoDetails = useCallback(async (repoId: string) => {
    if (!repoId) return;
    try {
      const scansRes = await apiFetch<{ scans: Array<{ id: string }> }>(`/api/repos/${repoId}/scans`);
      if (scansRes.scans && scansRes.scans.length > 0 && scansRes.scans[0]) {
        const scanId = scansRes.scans[0].id;
        setLatestScanId(scanId);
        const licRes = await apiFetch<LicenseSummary>(`/api/scans/${scanId}/licenses`);
        setLicenses(licRes);
      } else {
        setLatestScanId(null);
        setLicenses(null);
      }
    } catch {
      setLicenses(null);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRepos();
    }
  }, [user, loadRepos]);

  useEffect(() => {
    if (selectedRepoId) {
      loadRepoDetails(selectedRepoId);
    }
  }, [selectedRepoId, loadRepoDetails]);

  const handleDownloadSbom = async () => {
    if (!latestScanId) return;
    setDownloadingSbom(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/scans/${latestScanId}/sbom`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch SBOM');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyclonedx-sbom-${selectedRepoId}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        variant: 'success',
        title: 'CycloneDX SBOM Exported',
        description: 'Your JSON Software Bill of Materials has been downloaded for compliance review.',
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'SBOM Export Failed',
        description: err instanceof Error ? err.message : 'Unable to generate SBOM for this scan.',
      });
    } finally {
      setDownloadingSbom(false);
    }
  };

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading Dependencies & SBOM..."
        subMessage="Analyzing package licenses and software bill of materials"
      />
    );
  }

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="animate-text-reveal">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dependencies &amp; CycloneDX SBOM
            </h1>
            <p className="text-xs text-slate-500 mt-1 animate-text-delay-1">
              Package license compliance, Copyleft reciprocal risk audit, and CycloneDX v1.5 JSON SBOM export.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Repo selector */}
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#df3407] focus:outline-none shadow-sm"
            >
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>

            {/* Export SBOM */}
            <button
              onClick={handleDownloadSbom}
              disabled={!latestScanId || downloadingSbom}
              className="liquid-btn-primary flex items-center h-8 rounded-lg px-3.5 text-xs font-semibold disabled:opacity-40"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {downloadingSbom ? 'Generating...' : 'Export SBOM (JSON)'}
            </button>
          </div>
        </div>

        {/* License Compliance Summary Cards - Matching Unified Card Styling */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Permissive */}
          <div className="card-uniform rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Permissive Licenses</span>
              <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                Commercial Safe
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold font-mono text-slate-900">
              {licenses?.riskCounts?.permissive ?? 0}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">MIT, Apache-2.0, BSD-3-Clause, ISC</p>
          </div>

          {/* Weak Copyleft */}
          <div className="card-uniform rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Weak Copyleft</span>
              <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-400">
                File-level
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold font-mono text-slate-900">
              {licenses?.riskCounts?.weak_copyleft ?? 0}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">MPL-2.0, LGPL-2.1</p>
          </div>

          {/* Strong Copyleft */}
          <div className="card-uniform rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Strong Copyleft</span>
              <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-rose-400">
                Reciprocal Risk
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold font-mono text-slate-900">
              {licenses?.riskCounts?.copyleft ?? 0}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">GPL-3.0, AGPL-3.0</p>
          </div>
        </div>

        {/* Package Inventory List - Matching Unified Card Styling */}
        <div className="card-uniform rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Audited Package Manifest ({selectedRepo?.fullName})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Matched against Open Source Vulnerabilities (OSV) database with 1-hour in-memory cache.
              </p>
            </div>
          </div>

          {!latestScanId ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              <p className="text-xs text-muted-foreground">
                No scan history available for this repository yet. Run a scan from the Repositories page to generate SBOM.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {licenses && (
                <>
                  {((licenses.licenses || []).filter((l) => l.type === 'copyleft')).length > 0 && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-2">
                        <AlertOctagon className="h-4 w-4" /> Strong Copyleft Packages Detected
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(licenses.licenses || [])
                          .filter((l) => l.type === 'copyleft')
                          .map((pkg, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-mono text-rose-200"
                            >
                              {pkg.name} ({pkg.license})
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 font-semibold">
                          <th className="pb-3">Package Name</th>
                          <th className="pb-3">License Category</th>
                          <th className="pb-3">License Identifier</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {(licenses.licenses || [])
                          .filter((l) => l.type === 'permissive')
                          .map((pkg, idx) => (
                            <tr key={`p-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 text-slate-800">{pkg.name}</td>
                              <td className="py-2.5 text-emerald-400 font-sans">Permissive</td>
                              <td className="py-2.5 text-slate-400">{pkg.license}</td>
                              <td className="py-2.5">
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                                  <CheckCircle2 className="h-3 w-3" /> Safe
                                </span>
                              </td>
                            </tr>
                          ))}
                        {(licenses.licenses || [])
                          .filter((l) => l.type === 'weak_copyleft')
                          .map((pkg, idx) => (
                            <tr key={`w-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 text-slate-800">{pkg.name}</td>
                              <td className="py-2.5 text-amber-400 font-sans">Weak Copyleft</td>
                              <td className="py-2.5 text-slate-400">{pkg.license}</td>
                              <td className="py-2.5">
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-sans">
                                  <AlertTriangle className="h-3 w-3" /> Review
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
