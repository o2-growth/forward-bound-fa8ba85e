import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CostPerStage, CostPerStageGoals } from "./types";

interface CostGaugeProps {
  label: string;
  sublabel: string;
  value: number;
  goal: number;
  onClick?: () => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function CostGauge({ label, sublabel, value, goal, onClick }: CostGaugeProps) {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  // Inverted logic: below goal = green (good), above = red (bad)
  const isGood = percentage <= 100;
  const displayPercentage = Math.min(percentage, 150); // Cap at 150% for visual
  
  const chartData = [{ 
    value: Math.min(displayPercentage, 100), 
    fill: isGood ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" 
  }];

  return (
    <Card 
      className={cn(
        "bg-card border-border relative group transition-all duration-200 cursor-pointer hover:border-primary/50 hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </div>
      <CardContent className="flex flex-col items-center p-3 pt-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground/70">{sublabel}</span>
        
        <div className="relative w-20 h-20 my-1">
          <RadialBarChart 
            width={80} 
            height={80} 
            innerRadius="65%" 
            outerRadius="100%" 
            data={chartData} 
            startAngle={90} 
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-foreground">{formatCurrency(value)}</span>
          </div>
        </div>
        
        <span className={cn(
          "text-xs font-medium",
          isGood ? "text-chart-2" : "text-destructive"
        )}>
          {Math.round(percentage)}%
        </span>
        <span className="text-[10px] text-muted-foreground">Meta: {formatCurrency(goal)}</span>
      </CardContent>
    </Card>
  );
}

interface CostPerStageGaugesProps {
  costPerStage: CostPerStage;
  goals: CostPerStageGoals;
  onCostClick: (costKey: keyof CostPerStage) => void;
}

export function CostPerStageGauges({ 
  costPerStage, 
  goals,
  onCostClick 
}: CostPerStageGaugesProps) {
  const stages: { key: keyof CostPerStage; label: string; sublabel: string }[] = [
    { key: 'cpl', label: 'CPL', sublabel: 'Lead' },
    { key: 'cpmql', label: 'CPMQL', sublabel: 'MQL' },
    { key: 'cprm', label: 'CPRM', sublabel: 'RM' },
    { key: 'cprr', label: 'CPRR', sublabel: 'RR' },
    { key: 'cpp', label: 'CPP', sublabel: 'Proposta' },
    { key: 'cpv', label: 'CPV', sublabel: 'Venda' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Custo por Etapa do Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map(stage => (
            <CostGauge
              key={stage.key}
              label={stage.label}
              sublabel={stage.sublabel}
              value={costPerStage[stage.key]}
              goal={goals[stage.key]}
              onClick={() => onCostClick(stage.key)}
            />
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Clique em um indicador para ver o breakdown por canal
        </p>
      </CardContent>
    </Card>
  );
}
