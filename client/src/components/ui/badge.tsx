import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        critical: 'border-severity-critical/30 bg-severity-critical/10 text-severity-critical',
        high: 'border-severity-high/30 bg-severity-high/10 text-severity-high',
        medium: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
        low: 'border-severity-low/30 bg-severity-low/10 text-severity-low',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}