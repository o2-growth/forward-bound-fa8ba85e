import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RevenueMetrics, RevenueGoals } from "./types";
import { TrendingUp, Repeat, Settings, Zap, GraduationCap, ShoppingCart } from "lucide-react";

interface RevenueMetricsCardsProps {
  revenue: RevenueMetrics;
  goals: RevenueGoals;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

interface MetricCardProps {
  title: string;
  value: number;
  goal: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, goal, icon, color }: MetricCardProps) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const isAboveGoal = value >= goal;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={`p-1.5 rounded ${color}`}>
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground">{formatCurrency(value)}</span>
          <span className={`text-xs ${isAboveGoal ? 'text-green-600' : 'text-muted-foreground'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <Progress 
          value={percentage} 
          className="h-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Meta: {formatCurrency(goal)}</span>
          <span className={isAboveGoal ? 'text-green-600 font-medium' : ''}>
            {isAboveGoal ? '✓ Atingida' : `Faltam ${formatCurrency(goal - value)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueMetricsCards({ revenue, goals }: RevenueMetricsCardsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Receita</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="MRR"
          value={revenue.mrr}
          goal={goals.mrr}
          icon={<Repeat className="h-4 w-4 text-white" />}
          color="bg-blue-500"
        />
        <MetricCard
          title="Setup"
          value={revenue.setup}
          goal={goals.setup}
          icon={<Settings className="h-4 w-4 text-white" />}
          color="bg-green-500"
        />
        <MetricCard
          title="Pontual"
          value={revenue.pontual}
          goal={goals.pontual}
          icon={<Zap className="h-4 w-4 text-white" />}
          color="bg-yellow-500"
        />
        <MetricCard
          title="Educação"
          value={revenue.educacao}
          goal={goals.educacao}
          icon={<GraduationCap className="h-4 w-4 text-white" />}
          color="bg-purple-500"
        />
        <MetricCard
          title="GMV"
          value={revenue.gmv}
          goal={goals.gmv}
          icon={<ShoppingCart className="h-4 w-4 text-white" />}
          color="bg-primary"
        />
      </div>
    </div>
  );
}
