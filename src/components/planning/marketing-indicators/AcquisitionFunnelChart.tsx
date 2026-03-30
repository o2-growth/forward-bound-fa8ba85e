import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  label: string;
  value: number;
  color: string;
}

interface AcquisitionFunnelChartProps {
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
}

export function AcquisitionFunnelChart({ leads, mqls, rms, rrs }: AcquisitionFunnelChartProps) {
  const stages: FunnelStage[] = [
    { label: 'Leads', value: leads, color: 'hsl(var(--chart-1))' },
    { label: 'MQLs', value: mqls, color: 'hsl(var(--chart-2))' },
    { label: 'RM', value: rms, color: 'hsl(var(--chart-3))' },
    { label: 'RR', value: rrs, color: 'hsl(var(--chart-4))' },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  const getConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return (current / previous) * 100;
  };

  const hasData = stages.some(s => s.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Funil de Aquisição</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados de aquisição
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const widthPercentage = (stage.value / maxValue) * 100;
              const conversionRate = index > 0 
                ? getConversionRate(stage.value, stages[index - 1].value)
                : null;

              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatNumber(stage.value)}</span>
                      {conversionRate !== null && stage.value > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({conversionRate.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-8 bg-muted rounded-md overflow-hidden">
                    <div 
                      className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ 
                        width: `${Math.max(widthPercentage, 5)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
