'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from '@/lib/router';
import {
  ShieldCheck,
  KeyRound,
  Cpu,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { UserProfile } from '@repolens/shared';
import { AppShell } from '@/components/app-shell';
import { HypnoticLoader } from '@/components/hypnotic-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface SettingsResponse {
  profile: UserProfile;
  oauthScopes: string[];
  llm: {
    provider: string;
    model: string;
    configured: boolean;
  };
  connectedReposCount: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth({ redirectToIfUnauthenticated: '/' });

  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SettingsResponse>('/api/settings');
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  async function handleDeleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <HypnoticLoader
        message="Loading Account Settings..."
        subMessage="Syncing profile configuration and API engine keys"
      />
    );
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="animate-text-reveal">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground animate-text-delay-1">
            Manage your connected GitHub identity, AI engine configuration, and stored repository
            data.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="mb-2 h-7 w-7 text-severity-critical" aria-hidden="true" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={loadSettings}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          settings && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  <CardTitle>GitHub Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={settings.profile.avatarUrl}
                      alt={settings.profile.username}
                      className="h-12 w-12 rounded-full border border-border"
                    />
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        @{settings.profile.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {settings.profile.email ?? 'No public email on GitHub profile'}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Member since {new Date(settings.profile.createdAt).toLocaleDateString()} •{' '}
                        {settings.connectedReposCount} connected repositories
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>OAuth Permissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Your GitHub OAuth access token is encrypted at rest with AES-256-GCM and never
                      exposed to the browser.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.oauthScopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="font-mono text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                    <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
                    <CardTitle>AI Analysis Engine</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="font-mono font-medium uppercase">
                        {settings.llm.provider}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-mono font-medium">{settings.llm.model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">API Key Status</span>
                      {settings.llm.configured ? (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="high">Missing Key</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-severity-critical/40">
                <CardHeader>
                  <CardTitle className="text-severity-critical">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Permanently delete your RepoLens account, remove registered GitHub webhooks, and
                    purge all connected repositories, scan histories, findings, summaries, and
                    indexed code chunks.
                  </p>

                  {!confirmDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="border-severity-critical/50 text-severity-critical hover:bg-severity-critical/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete account &amp; all data
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 rounded-md border border-severity-critical/40 bg-severity-critical/10 p-3">
                      <span className="text-xs font-medium text-severity-critical">
                        Are you sure? This action cannot be undone.
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={deleting}
                          onClick={handleDeleteAccount}
                          className="bg-severity-critical text-slate-900 hover:bg-severity-critical/90"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              Deleting...
                            </>
                          ) : (
                            'Confirm permanent deletion'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleting}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}