import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";

interface DealsWonWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

// Mock data for non-O2 TAX BUs
const mockTrendData = [
  { day: 1, value: 1 },
  { day: 2, value: 2 },
  { day: 3, value: 2 },
  { day: 4, value: 3 },
  { day: 5, value: 4 },
  { day: 6, value: 5 },
  { day: 7, value: 6 },
];

const mockDealsWon: DetailItem[] = [
  { id: "1", name: "Tech Solutions Ltda", company: "João Silva", value: 25000, date: "2026-01-15", responsible: "Carlos Mendes" },
  { id: "2", name: "Inovação Digital SA", company: "Maria Santos", value: 18000, date: "2026-01-14", responsible: "Ana Paula" },
  { id: "3", name: "Startup XYZ", company: "Pedro Costa", value: 12000, date: "2026-01-13", responsible: "Carlos Mendes" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function DealsWonWidget({ buKey, startDate, endDate }: DealsWonWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const isO2Tax = buKey === 'o2_tax';
  const { getDealsWon, toDetailItem, isLoading } = useO2TaxAnalytics(startDate, endDate);
  
  const dealsWon = isO2Tax ? getDealsWon.count : mockDealsWon.length;
  const totalValue = isO2Tax 
    ? getDealsWon.totalValue 
    : mockDealsWon.reduce((acc, deal) => acc + (deal.value || 0), 0);
  const trend = isO2Tax ? getDealsWon.trend : 15;
  const isPositiveTrend = trend >= 0;

  const getDetailItems = (): DetailItem[] => {
    if (isO2Tax) {
      return getDealsWon.cards.map(toDetailItem);
    }
    return mockDealsWon;
  };

  if (isO2Tax && isLoading) {
    return (
      <Card className="bg-card border-border h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="bg-card border-border h-full cursor-pointer hover:border-primary/50 transition-colors group"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            Negócios Ganhos
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{dealsWon}</span>
                <span className="text-sm text-muted-foreground">fechados</span>
              </div>
              <div className="mt-1">
                <span className="text-lg font-semibold text-chart-2">{formatCurrency(totalValue)}</span>
              </div>
              {trend !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {isPositiveTrend ? (
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-medium ${isPositiveTrend ? "text-chart-2" : "text-destructive"}`}>
                    {isPositiveTrend ? "+" : ""}{trend}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs anterior</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Clique para ver detalhes
              </p>
            </div>
            <div className="w-24 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTrendData}>
                  <defs>
                    <linearGradient id="dealsWonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    fill="url(#dealsWonGradient)" 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))"
                    }}
                    formatter={(value: number) => [value, "Vendas"]}
                    labelFormatter={() => ""}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Negócios Ganhos"
        description={`${dealsWon} negócios fechados totalizando ${formatCurrency(totalValue)}`}
        items={getDetailItems()}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "company", label: "Contato" },
          { key: "value", label: "Valor", format: columnFormatters.currency },
          { key: "date", label: "Data Fechamento", format: columnFormatters.date },
          { key: "responsible", label: "Responsável" },
        ]}
      />
    </>
  );
}
