import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'profitable' | 'warning' | 'danger' | 'neutral';
  prefix?: string;
  suffix?: string;
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend = 'neutral',
  prefix = '',
  suffix = ''
}: KPICardProps) {
  const trendClasses = {
    profitable: 'kpi-profitable',
    warning: 'kpi-warning',
    danger: 'kpi-danger',
    neutral: '',
  };

  const valueClasses = {
    profitable: 'text-profitable',
    warning: 'text-warning',
    danger: 'text-danger',
    neutral: 'text-foreground',
  };

  return (
    <div className={cn('kpi-card animate-slide-up', trendClasses[trend])}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('stat-value', valueClasses[trend])}>
            {prefix}{typeof value === 'number' ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          trend === 'profitable' && 'bg-profitable/10',
          trend === 'warning' && 'bg-warning/10',
          trend === 'danger' && 'bg-danger/10',
          trend === 'neutral' && 'bg-muted'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            trend === 'profitable' && 'text-profitable',
            trend === 'warning' && 'text-warning',
            trend === 'danger' && 'text-danger',
            trend === 'neutral' && 'text-muted-foreground'
          )} />
        </div>
      </div>
    </div>
  );
}
