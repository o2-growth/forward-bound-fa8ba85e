import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface BarChartDataItem {
  label: string;
  value: number;
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
}

interface DrillDownBarChartProps {
  title: string;
  data: BarChartDataItem[];
  formatValue?: (value: number) => string;
  maxItems?: number;
  sortable?: boolean;
  sortOrder?: string[];
}

export function DrillDownBarChart({ 
  title, 
  data, 
  formatValue = String, 
  maxItems = 5,
  sortable = false,
  sortOrder = [],
}: DrillDownBarChartProps) {
  const [sortByRange, setSortByRange] = useState(false);

  if (!data || data.length === 0) return null;
  
  const sortedData = sortByRange && sortOrder.length > 0
    ? [...data].sort((a, b) => {
        const idxA = sortOrder.indexOf(a.label);
        const idxB = sortOrder.indexOf(b.label);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      })
    : data;

  const displayData = sortByRange ? sortedData : sortedData.slice(0, maxItems);
  const maxValue = Math.max(...displayData.map(d => d.value), 1);

  return (
    <div className="space-y-3 flex-1 min-w-[200px]">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {sortable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSortByRange(!sortByRange)}
            title={sortByRange ? 'Ordenar por quantidade' : 'Ordenar por faixa'}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {displayData.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-44 truncate" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded transition-all duration-300",
                  item.highlight === 'success' ? 'bg-green-500' :
                  item.highlight === 'danger' ? 'bg-red-500' :
                  item.highlight === 'warning' ? 'bg-amber-500' :
                  'bg-primary'
                )}
                style={{ width: `${Math.max((item.value / maxValue) * 100, 2)}%` }}
              />
            </div>
            <span className="text-sm font-medium w-24 text-right text-foreground">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
