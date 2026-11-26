import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertOctagon,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; iconBg: string; iconColor: string; Icon: React.ElementType }
> = {
  success: {
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  info: {
    border: 'border-blue-200',
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    Icon: Info,
  },
  warning: {
    border: 'border-amber-200',
    iconBg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
  },
  error: {
    border: 'border-rose-200',
    iconBg: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    Icon: AlertOctagon,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 5500, action }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant, duration, action }]);

      if (duration > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Soft Light Toast Viewport */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          const Icon = style.Icon;

          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white/95 p-4 text-slate-900 shadow-[0_16px_44px_rgba(15,23,42,0.14)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200',
                style.border,
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                  style.iconBg,
                )}
              >
                <Icon className={cn('h-4 w-4', style.iconColor)} aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-semibold text-slate-900 leading-snug">{item.title}</p>
                {item.description && (
                  <p className="text-[11px] leading-relaxed text-slate-600">{item.description}</p>
                )}

                {item.action && (
                  <div className="pt-1.5">
                    {item.action.href ? (
                      <a
                        href={item.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        <span>{item.action.label}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          item.action?.onClick?.();
                          dismiss(item.id);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        {item.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
