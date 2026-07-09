import { cn } from "@/lib/utils";

export interface KpiItem {
  icon: string;
  value: string | number;
  label: string;
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
  active?: boolean;
}

interface KpiCardProps extends KpiItem {}

export function KpiCard({ icon, value, label, highlight = 'neutral', onClick, active }: KpiCardProps) {
  const colorClasses = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    neutral: 'bg-muted/50 border-border',
  };

  const clickable = typeof onClick === 'function';

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        'flex flex-col items-center justify-center p-3 rounded-lg border min-w-[100px] flex-1 transition-all',
        colorClasses[highlight],
        clickable && 'cursor-pointer hover:brightness-110 hover:shadow-sm',
        active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
      )}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xl font-bold text-foreground leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground text-center leading-tight mt-0.5">{label}</span>
    </div>
  );
}
