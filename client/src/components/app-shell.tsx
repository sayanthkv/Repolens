import { useEffect, useRef, useState } from 'react';
import Link from '@/lib/router';
import { usePathname } from '@/lib/router';
import {
  LayoutDashboard,
  GitBranch,
  AlertTriangle,
  Package,
  MessageSquareCode,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import type { UserProfile } from '@repolens/shared';
import { RepoLensLogo } from '@/components/repolens-logo';
import { HeroWireframeCanvas } from '@/components/hero-wireframe-canvas';
import { cn } from '@/lib/utils';

interface AppShellProps {
  user: UserProfile;
  onLogout: () => Promise<void>;
  fullBleedTop?: boolean;
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/repos', label: 'Repositories', icon: GitBranch },
  { href: '/findings', label: 'Findings', icon: AlertTriangle },
  { href: '/dependencies', label: 'Dependencies', icon: Package },
  { href: '/ask', label: 'Ask AI', icon: MessageSquareCode },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ user, onLogout, fullBleedTop = false, children }: AppShellProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Automatically apply slow scroll-reveal transitions to sections on every page
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealElement = (el: HTMLElement) => {
      requestAnimationFrame(() => {
        el.classList.add('is-visible');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            revealElement(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: '60px 0px 60px 0px' },
    );

    const revealVisibleInViewport = () => {
      const candidates = container.querySelectorAll<HTMLElement>('section, [data-reveal]');
      candidates.forEach((el) => {
        if (el.dataset.revealBound !== '1') {
          el.dataset.revealBound = '1';
          el.classList.add('reveal-section');
        }
        if (el.classList.contains('is-visible')) return;

        const rect = el.getBoundingClientRect();
        const inView = rect.top <= window.innerHeight + 120 && rect.bottom >= -120;
        if (prefersReduced || inView) {
          revealElement(el);
          observer.unobserve(el);
        } else {
          observer.observe(el);
        }
      });
    };

    revealVisibleInViewport();
    window.addEventListener('scroll', revealVisibleInViewport, { passive: true });
    window.addEventListener('resize', revealVisibleInViewport, { passive: true });

    const mut = new MutationObserver(() => revealVisibleInViewport());
    mut.observe(container, { childList: true, subtree: true });

    // Safety fallback: ensure nothing stays hidden after initial render
    const fallbackTimer = window.setTimeout(revealVisibleInViewport, 400);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('scroll', revealVisibleInViewport);
      window.removeEventListener('resize', revealVisibleInViewport);
      observer.disconnect();
      mut.disconnect();
    };
  }, [pathname]);

  return (
    <div className="relative min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#F8FBFF] via-[#F2F6FD] to-[#E6EFFC] text-slate-900">
      {/* Global Undulating Wireframe Grid Across All Pages */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroWireframeCanvas
          strokeColor="rgba(37, 99, 235, 0.11)"
          showHighlightNode={false}
        />
      </div>

      {/* Modern, Soft & Unique Floating Frosted Dock Navbar */}
      <header className="fixed inset-x-0 top-4 z-40 flex flex-col items-center px-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-2.5 sm:gap-4 rounded-full border border-white/90 bg-white/78 p-1.5 backdrop-blur-2xl transition-all duration-300',
            scrolled
              ? 'scale-[0.985] shadow-[0_14px_40px_rgba(37,99,235,0.12),0_4px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)]'
              : 'shadow-[0_10px_34px_rgba(37,99,235,0.08),0_2px_8px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.95)]',
          )}
        >
          {/* Brand Capsule */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full bg-slate-50/90 border border-slate-200/70 py-1 pl-1.5 pr-3 transition-colors hover:bg-white"
          >
            <RepoLensLogo className="h-6 w-6 rounded-full" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              RepoLens
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live" />
          </Link>

          {/* Soft Navigation Pill Track */}
          <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-slate-100/75 p-1 border border-slate-200/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200',
                    active
                      ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-[0_4px_14px_rgba(15,23,42,0.2)]'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-white/80',
                  )}
                >
                  {active && <Icon className="h-3.5 w-3.5 text-blue-300" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/repos/connect"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.38)] hover:-translate-y-0.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Repo</span>
            </Link>

            {/* User Capsule */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 p-1 pr-2.5 text-xs text-slate-700 hover:bg-white hover:border-blue-200 transition-all"
              >
                <img
                  src={user.avatarUrl || 'https://github.com/github.png'}
                  alt={user.username}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                />
                <span className="hidden sm:inline text-xs font-medium">{user.username}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl z-50 animate-page-enter">
                  <div className="border-b border-slate-100 px-3 py-2 text-xs">
                    <p className="font-semibold text-slate-900">{user.username}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {user.email || 'Authenticated via GitHub'}
                    </p>
                  </div>
                  <div className="p-1 text-xs">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      Security Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors mt-1 border-t border-slate-100"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="rounded-full p-2 text-slate-700 hover:bg-slate-100 transition-colors md:hidden"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Soft Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto mt-2.5 w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white/95 p-3 text-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-2xl md:hidden animate-page-enter">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/repos/connect"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1.5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Connect Repository</span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Container with Smooth Route Entrance Transition */}
      <main
        key={pathname}
        ref={mainRef}
        className={cn(
          'relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 animate-page-enter',
          fullBleedTop ? 'pt-0' : 'pt-24',
        )}
      >
        {children}
      </main>

      {/* Soft Light Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white/70 py-6 text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
            <span className="text-slate-700 font-medium text-xs">
              RepoLens Continuous Defense Engine
            </span>
          </div>
          <p className="font-mono text-[11px] text-slate-500">v0.1.0 • OAuth least-privilege</p>
        </div>
      </footer>
    </div>
  );
}
