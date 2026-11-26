import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from '@/lib/router';
import type { UserProfile } from '@repolens/shared';
import { apiFetch } from './api';

export function useAuth({ redirectToIfUnauthenticated }: { redirectToIfUnauthenticated?: string } = {}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const profile = await apiFetch<UserProfile>('/api/me');
      setUser(profile);
    } catch {
      setUser(null);
      if (redirectToIfUnauthenticated) {
        router.replace(redirectToIfUnauthenticated);
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [redirectToIfUnauthenticated, router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  }, [router]);

  return { user, loading, logout, refresh };
}
