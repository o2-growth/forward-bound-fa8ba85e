import { DrillDownBarChart, BarChartDataItem } from "./DrillDownBarChart";
import { DrillDownDistribution, DistributionDataItem } from "./DrillDownDistribution";
import { DrillDownPieChart, PieChartDataItem } from "./DrillDownPieChart";

export interface ChartConfig {
  type: 'bar' | 'distribution' | 'pie';
  title: string;
  data: (BarChartDataItem | DistributionDataItem | PieChartDataItem)[];
  formatValue?: (value: number) => string;
  sortable?: boolean;
  sortOrder?: string[];
}

interface DrillDownChartsProps {
  charts: ChartConfig[];
}

export function DrillDownCharts({ charts }: DrillDownChartsProps) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-6 mb-4 p-4 bg-muted/30 rounded-lg border">
      {charts.map((chart, index) => {
        switch (chart.type) {
          case 'bar':
            return (
              <DrillDownBarChart
                key={index}
                title={chart.title}
                data={chart.data as BarChartDataItem[]}
                formatValue={chart.formatValue}
                sortable={chart.sortable}
                sortOrder={chart.sortOrder}
              />
            );
          case 'distribution':
            return (
              <DrillDownDistribution
                key={index}
                title={chart.title}
                data={chart.data as DistributionDataItem[]}
              />
            );
          case 'pie':
            return (
              <DrillDownPieChart
                key={index}
                title={chart.title}
                data={chart.data as PieChartDataItem[]}
                formatValue={chart.formatValue}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// Re-export types for convenience
export type { BarChartDataItem, DistributionDataItem, PieChartDataItem };
