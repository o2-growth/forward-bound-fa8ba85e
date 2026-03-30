import { cn } from "@/lib/utils";

export interface DistributionDataItem {
  label: string;
  value: number;
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
}

interface DrillDownDistributionProps {
  title: string;
  data: DistributionDataItem[];
}

export function DrillDownDistribution({ title, data }: DrillDownDistributionProps) {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-3 flex-1 min-w-[200px]">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="space-y-2">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20">{item.label}</span>
              <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-l transition-all duration-300",
                    item.highlight === 'success' ? 'bg-green-500' :
                    item.highlight === 'danger' ? 'bg-red-500' :
                    item.highlight === 'warning' ? 'bg-amber-500' :
                    'bg-blue-500'
                  )}
                  style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="text-sm w-24 text-right text-foreground">
                {item.value} ({Math.round(pct)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
