import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";

interface DealsInProgressWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

// Mock data for non-O2 TAX BUs
const mockData = [
  { phase: "RM", value: 12, color: "hsl(var(--chart-1))" },
  { phase: "RR", value: 8, color: "hsl(var(--chart-2))" },
  { phase: "Proposta", value: 6, color: "hsl(var(--chart-3))" },
  { phase: "Assinatura", value: 3, color: "hsl(var(--chart-4))" },
];

const mockDealsInProgress: DetailItem[] = [
  { id: "1", name: "Tech Solutions Ltda", company: "João Silva", phase: "Proposta", value: 25000, date: "2026-01-15", responsible: "Carlos" },
  { id: "2", name: "Inovação Digital SA", company: "Maria Santos", phase: "RR", value: 18000, date: "2026-01-14", responsible: "Ana Paula" },
  { id: "3", name: "Startup XYZ", company: "Pedro Costa", phase: "RM", value: 12000, date: "2026-01-13", responsible: "Carlos" },
  { id: "4", name: "Mega Corp", company: "Fernanda Lima", phase: "Assinatura", value: 85000, date: "2026-01-12", responsible: "Roberto" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function DealsInProgressWidget({ buKey, startDate, endDate }: DealsInProgressWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const isO2Tax = buKey === 'o2_tax';
  const { getDealsInProgress, toDetailItem, isLoading } = useO2TaxAnalytics(startDate, endDate);
  
  // Use real data for O2 TAX, mock data for others
  const pieData = isO2Tax ? getDealsInProgress.phaseData : mockData;
  const totalDeals = isO2Tax ? getDealsInProgress.count : mockDealsInProgress.length;
  const totalValue = isO2Tax 
    ? getDealsInProgress.totalValue 
    : mockDealsInProgress.reduce((acc, deal) => acc + (deal.value || 0), 0);

  const getDetailItems = (): DetailItem[] => {
    if (isO2Tax) {
      return getDealsInProgress.cards.map(toDetailItem);
    }
    return mockDealsInProgress;
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
            Negócios em Andamento
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{totalDeals}</span>
                <span className="text-sm text-muted-foreground">negócios</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-4 w-4 text-chart-2" />
                <span className="text-lg font-semibold text-foreground">{formatCurrency(totalValue)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Clique para ver detalhes
              </p>
            </div>
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="phase"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.phase}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Negócios em Andamento"
        description={`${totalDeals} negócios ativos totalizando ${formatCurrency(totalValue)} em potencial`}
        items={getDetailItems()}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "company", label: "Contato" },
          { key: "phase", label: "Fase", format: columnFormatters.phase },
          { key: "value", label: "Valor", format: columnFormatters.currency },
          { key: "date", label: "Última Atualização", format: columnFormatters.date },
          { key: "responsible", label: "Responsável" },
        ]}
      />
    </>
  );
}
