import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FunnelStage {
  stage: string;
  value: number;
  percent: string;
}

interface SalesFunnelVisualProps {
  title: string;
  icon: React.ReactNode;
  stages: FunnelStage[];
  mqlToVenda: number;
  leadToVenda: number;
  color: string;
}

const stageColors = [
  'from-orange-400 to-orange-500',
  'from-emerald-400 to-cyan-500',
  'from-cyan-500 to-blue-500',
  'from-blue-500 to-blue-600',
  'from-blue-600 to-slate-500',
  'from-slate-500 to-slate-600',
];

const widthPercentages = [100, 85, 70, 55, 45, 35];

const formatNumber = (value: number) => 
  new Intl.NumberFormat("pt-BR").format(Math.round(value));

export function SalesFunnelVisual({ 
  title, 
  icon, 
  stages, 
  mqlToVenda, 
  leadToVenda, 
  color 
}: SalesFunnelVisualProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {stages.map((item, index) => {
            const colorClass = stageColors[index] || stageColors[stageColors.length - 1];
            const widthPercent = widthPercentages[index] || 35;
            const isLast = index === stages.length - 1;
            const isFirst = index === 0;
            
            return (
              <div key={item.stage} className="relative flex items-center justify-center">
                <div
                  className={cn(
                    `relative h-14 bg-gradient-to-r ${colorClass} rounded-sm transition-all duration-300`,
                    `flex items-center justify-center px-3 min-w-[180px]`,
                    isLast && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                  style={{ width: `${widthPercent}%` }}
                >
                  <div className="flex items-center gap-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden">
                    {/* Número da etapa */}
                    <span className="bg-white/20 rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    
                    {/* Nome da etapa */}
                    <span className="hidden sm:inline truncate font-semibold">
                      {item.stage}
                    </span>
                    
                    {/* Valor absoluto */}
                    <span className="font-bold flex-shrink-0">
                      {formatNumber(item.value)}
                    </span>
                    
                    {/* Porcentagem de conversão */}
                    {!isFirst && item.percent !== "-" && (
                      <span className="text-xs text-white/70 flex-shrink-0">
                        ({item.percent})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Badges de conversão total */}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            MQL → Venda: {(mqlToVenda * 100).toFixed(1)}%
          </Badge>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Lead → Venda: {(leadToVenda * 100).toFixed(1)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
