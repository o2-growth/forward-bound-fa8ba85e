import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CostPerStage } from "./types";
import { ArrowRight } from "lucide-react";

interface CostPerStageChartProps {
  costPerStage: CostPerStage;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

interface StageItemProps {
  label: string;
  sublabel: string;
  value: number;
  color: string;
  isLast?: boolean;
}

function StageItem({ label, sublabel, value, color, isLast }: StageItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <div 
          className={`w-16 h-16 rounded-full flex flex-col items-center justify-center ${color} text-white shadow-lg`}
        >
          <span className="text-xs font-medium">{label}</span>
          <span className="text-sm font-bold">{formatCurrency(value)}</span>
        </div>
        <span className="text-xs text-muted-foreground mt-1">{sublabel}</span>
      </div>
      {!isLast && (
        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}

export function CostPerStageChart({ costPerStage }: CostPerStageChartProps) {
  const stages = [
    { label: 'CPL', sublabel: 'Lead', value: costPerStage.cpl, color: 'bg-blue-500' },
    { label: 'CPMQL', sublabel: 'MQL', value: costPerStage.cpmql, color: 'bg-indigo-500' },
    { label: 'CPRM', sublabel: 'RM', value: costPerStage.cprm, color: 'bg-purple-500' },
    { label: 'CPRR', sublabel: 'RR', value: costPerStage.cprr, color: 'bg-pink-500' },
    { label: 'CPP', sublabel: 'Proposta', value: costPerStage.cpp, color: 'bg-orange-500' },
    { label: 'CPV', sublabel: 'Venda', value: costPerStage.cpv, color: 'bg-green-600' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Custo por Etapa do Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-center gap-4 py-4">
          {stages.map((stage, index) => (
            <StageItem
              key={stage.label}
              label={stage.label}
              sublabel={stage.sublabel}
              value={stage.value}
              color={stage.color}
              isLast={index === stages.length - 1}
            />
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Custo acumulado de investimento em mídia por chegada em cada etapa do funil</p>
        </div>
      </CardContent>
    </Card>
  );
}
