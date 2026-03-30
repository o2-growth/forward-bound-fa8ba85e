import { cn } from "@/lib/utils";

export interface KpiItem {
  icon: string;
  value: string | number;
  label: string;
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
}

interface KpiCardProps extends KpiItem {}

export function KpiCard({ icon, value, label, highlight = 'neutral' }: KpiCardProps) {
  const colorClasses = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    danger: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    neutral: 'bg-muted/50 border-border',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-3 rounded-lg border min-w-[100px] flex-1',
      colorClasses[highlight]
    )}>
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xl font-bold text-foreground leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground text-center leading-tight mt-0.5">{label}</span>
    </div>
  );
}
