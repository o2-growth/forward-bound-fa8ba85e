import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, TrendingDown, Building2, DollarSign, Expand, BarChart3, LineChart, Rocket, Users } from "lucide-react";
import { useIndicatorsRealized } from "@/hooks/useIndicatorsRealized";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { 
  dashboardBuConfigs, 
  dashboardProjectedData as fallbackProjectedData,
  aggregateRealizedForDashboard,
  formatCurrency,
  formatCompact,
  months,
  DashboardBUKey
} from "./salesData";
import { SalesGoalsCards } from "./SalesGoalsCards";
import { SalesGoalsTable } from "./SalesGoalsTable";
import { SalesGoalsCharts } from "./SalesGoalsCharts";
import { ExpansaoBreakdown } from "./ExpansaoBreakdown";

const buIcons: Record<DashboardBUKey, React.ReactNode> = {
  modelo_atual: <Building2 className="h-5 w-5" />,
  o2_tax: <DollarSign className="h-5 w-5" />,
  expansao_o2: <Expand className="h-5 w-5" />,
};

export function SalesGoalsTab() {
  const [selectedBU, setSelectedBU] = useState<DashboardBUKey | 'all'>('all');
  const { realizedByBU, totalRealized, isLoading, error } = useIndicatorsRealized(2026);
  const { metasPorBU, isLoaded: metasLoaded } = useMediaMetas();
  
  // Aggregate realized data for dashboard (combines oxy_hacker + franquia into expansao_o2)
  const dashboardRealizedByBU = aggregateRealizedForDashboard(realizedByBU);
  
  // Build projected data from MediaMetas context or use fallback
  const dashboardProjectedData = useMemo(() => {
    // Check if context has data (any BU has values)
    const hasContextData = metasLoaded && Object.keys(metasPorBU.modelo_atual).length > 0;
    
    if (!hasContextData) {
      return fallbackProjectedData;
    }
    
    // Build dashboard projected data from context
    // Aggregate oxy_hacker + franquia into expansao_o2
    const expansao_o2: Record<string, number> = {};
    months.forEach(month => {
      expansao_o2[month] = (metasPorBU.oxy_hacker[month] || 0) + (metasPorBU.franquia[month] || 0);
    });
    
    return {
      modelo_atual: metasPorBU.modelo_atual,
      o2_tax: metasPorBU.o2_tax,
      expansao_o2,
    };
  }, [metasPorBU, metasLoaded]);
  
  // Calculate totals using current projected data
  const calculateDashboardBUTotal = (buKey: DashboardBUKey): number => {
    return Object.values(dashboardProjectedData[buKey] || {}).reduce((a, b) => a + b, 0);
  };
  
  const grandTotalProjected = dashboardBuConfigs.reduce(
    (sum, bu) => sum + calculateDashboardBUTotal(bu.key), 
    0
  );

  // Calculate achievement rate
  const achievementRate = grandTotalProjected > 0 
    ? (totalRealized / grandTotalProjected) * 100 
    : 0;

  // Find best performing BU
  const buPerformance = dashboardBuConfigs.map(bu => {
    const projected = calculateDashboardBUTotal(bu.key);
    const realized = months.reduce((sum, month) => sum + (dashboardRealizedByBU[bu.key]?.[month] || 0), 0);
    const rate = projected > 0 ? (realized / projected) * 100 : 0;
    return { ...bu, projected, realized, rate };
  });

  const bestBU = buPerformance.reduce((best, current) => 
    current.rate > best.rate ? current : best
  , buPerformance[0]);

  const gap = grandTotalProjected - totalRealized;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Erro ao carregar dados</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground border-0">
            <Target className="h-3 w-3 mr-1" />
            Dashboard de Metas de Vendas
          </Badge>
          <h2 className="font-display text-4xl font-bold mb-4">Acompanhamento 2026</h2>
          <p className="text-primary-foreground/80 max-w-2xl mb-6">
            Visualize o progresso das metas de vendas por BU, compare previsto vs realizado e acompanhe os indicadores chave.
          </p>
          
          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-sm text-primary-foreground/70 mb-1">Meta Anual</p>
              <p className="font-display text-2xl font-bold">{formatCompact(grandTotalProjected)}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-sm text-primary-foreground/70 mb-1">Realizado</p>
              <p className="font-display text-2xl font-bold">{formatCompact(totalRealized)}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-sm text-primary-foreground/70 mb-1">Taxa de Atingimento</p>
              <p className="font-display text-2xl font-bold flex items-center gap-1">
                {achievementRate.toFixed(1)}%
                {achievementRate >= 50 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-300" />
                )}
              </p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-sm text-primary-foreground/70 mb-1">Gap para Meta</p>
              <p className="font-display text-2xl font-bold">{formatCompact(gap)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BU Selector */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={selectedBU === 'all' ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
              onClick={() => setSelectedBU('all')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Consolidado
            </Badge>
            {dashboardBuConfigs.map((bu) => (
              <Badge
                key={bu.key}
                variant={selectedBU === bu.key ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                onClick={() => setSelectedBU(bu.key)}
              >
                {buIcons[bu.key]}
                <span className="ml-2">{bu.label}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expansão Breakdown - Show when Expansão O2 is selected */}
      {selectedBU === 'expansao_o2' && (
        <ExpansaoBreakdown
          projectedOxyHacker={metasPorBU.oxy_hacker}
          projectedFranquia={metasPorBU.franquia}
          realizedOxyHacker={realizedByBU.oxy_hacker || {}}
          realizedFranquia={realizedByBU.franquia || {}}
          isLoading={isLoading}
        />
      )}

      {/* Cards Section */}
      <SalesGoalsCards 
        buConfigs={dashboardBuConfigs}
        projectedData={dashboardProjectedData}
        realizedByBU={dashboardRealizedByBU}
        calculateBUTotal={calculateDashboardBUTotal}
        calculateBURealized={(bu: DashboardBUKey) => 
          months.reduce((sum, month) => sum + (dashboardRealizedByBU[bu]?.[month] || 0), 0)
        }
        selectedBU={selectedBU}
        isLoading={isLoading}
      />

      {/* Tabs for Table and Charts */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="table" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Tabela Detalhada
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <LineChart className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <SalesGoalsTable 
            buConfigs={dashboardBuConfigs}
            projectedData={dashboardProjectedData}
            realizedByBU={dashboardRealizedByBU}
            selectedBU={selectedBU}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <SalesGoalsCharts 
            buConfigs={dashboardBuConfigs}
            projectedData={dashboardProjectedData}
            realizedByBU={dashboardRealizedByBU}
            selectedBU={selectedBU}
            calculateBUTotal={calculateDashboardBUTotal}
            calculateBURealized={(bu: DashboardBUKey) => 
              months.reduce((sum, month) => sum + (dashboardRealizedByBU[bu]?.[month] || 0), 0)
            }
          />
        </TabsContent>
      </Tabs>

      {/* Best Performer Card */}
      <Card className="glass-card border-2 border-success/30 bg-success/5">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-success">
            <TrendingUp className="h-5 w-5" />
            Melhor Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-display font-bold">{bestBU.label}</p>
              <p className="text-muted-foreground">
                {formatCurrency(bestBU.realized)} de {formatCurrency(bestBU.projected)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-bold text-success">{bestBU.rate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">taxa de atingimento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
