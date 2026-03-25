import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}) => {
  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'accent':
        return 'bg-accent/10 text-accent';
      case 'success':
        return 'bg-status-resolved-bg text-status-resolved';
      case 'warning':
        return 'bg-status-progress-bg text-status-progress';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-status-resolved' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', getIconStyles())}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
