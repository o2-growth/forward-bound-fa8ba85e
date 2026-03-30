import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Users } from "lucide-react";

interface GaugeCardProps {
  title: string;
  value: number;
  goal: number;
  format: 'currency' | 'multiplier' | 'percentage';
  icon: React.ReactNode;
  invertColors?: boolean; // For metrics where lower is better (CAC)
}

function GaugeCard({ title, value, goal, format, icon, invertColors = false }: GaugeCardProps) {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  const isOnTrack = invertColors ? value <= goal : value >= goal;
  
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return val >= 1000 
        ? `R$ ${(val / 1000).toFixed(1)}k`
        : `R$ ${val.toFixed(0)}`;
    }
    if (format === 'multiplier') {
      return `${val.toFixed(1)}x`;
    }
    return `${val.toFixed(1)}%`;
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatValue(value)}
            </span>
            {value !== 0 && goal !== 0 && (
              <span className={`text-sm flex items-center gap-1 ${isOnTrack ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isOnTrack ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Meta: {formatValue(goal)}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceGaugesProps {
  roas: number;
  roasGoal: number;
  roiLtv: number;
  roiLtvGoal: number;
  cac: number;
  cacGoal: number;
  ltv: number;
  ltvGoal: number;
  investment: number;
  investmentGoal: number;
  metaAdsSpend?: number;
  googleAdsSpend?: number;
}

export function PerformanceGauges({
  roas,
  roasGoal,
  roiLtv,
  roiLtvGoal,
  cac,
  cacGoal,
  ltv,
  ltvGoal,
  investment,
  investmentGoal,
  metaAdsSpend = 0,
  googleAdsSpend = 0,
}: PerformanceGaugesProps) {
  // Imposto 15% so na Meta Ads, outros canais sem imposto
  const investmentWithTax = (metaAdsSpend * 1.15) + (investment - metaAdsSpend);
  const investmentGoalWithTax = investmentGoal * 1.15;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <GaugeCard
        title="ROAS"
        value={roas}
        goal={roasGoal}
        format="multiplier"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <GaugeCard
        title="ROI LTV"
        value={roiLtv}
        goal={roiLtvGoal}
        format="multiplier"
        icon={<Target className="h-4 w-4" />}
      />
      <GaugeCard
        title="CAC"
        value={cac}
        goal={cacGoal}
        format="currency"
        icon={<Users className="h-4 w-4" />}
        invertColors // Lower CAC is better
      />
      <GaugeCard
        title="LTV"
        value={ltv}
        goal={ltvGoal}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
      />
      {/* Investment: sem imposto (API + eventos) */}
      <GaugeCard
        title="Invest. (s/ imposto)"
        value={investment}
        goal={investmentGoal}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
      />
      {/* Investment: com imposto (+15% na Meta + eventos) */}
      <GaugeCard
        title="Invest. (c/ imposto)"
        value={investmentWithTax}
        goal={investmentGoalWithTax}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
      />
    </div>
  );
}
