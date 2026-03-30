import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";

interface LossReasonsWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function LossReasonsWidget({ buKey, startDate, endDate }: LossReasonsWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const modeloAtualAnalytics = useModeloAtualAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');

  const isLoading = modeloAtualAnalytics.isLoading || o2TaxAnalytics.isLoading || franquiaAnalytics.isLoading || oxyHackerAnalytics.isLoading;

  // Aggregate loss reasons based on selected BU(s)
  const { chartData, allDetailItems } = useMemo(() => {
    const reasonAgg = new Map<string, { count: number; items: DetailItem[] }>();

    const addSource = (lossReasons: { reason: string; count: number; cards: any[] }[], toDetailItem: (card: any) => DetailItem) => {
      for (const lr of lossReasons) {
        const existing = reasonAgg.get(lr.reason) || { count: 0, items: [] };
        existing.count += lr.count;
        existing.items.push(...lr.cards.map(toDetailItem));
        reasonAgg.set(lr.reason, existing);
      }
    };

    if (buKey === 'modelo_atual' || buKey === 'all') {
      addSource(modeloAtualAnalytics.getLossReasons, modeloAtualAnalytics.toDetailItem);
    }
    if (buKey === 'o2_tax' || buKey === 'all') {
      addSource(o2TaxAnalytics.getLossReasons, o2TaxAnalytics.toDetailItem);
    }
    if (buKey === 'oxy_hacker' || buKey === 'all') {
      addSource(oxyHackerAnalytics.getLossReasons, oxyHackerAnalytics.toDetailItem);
    }
    if (buKey === 'franquia' || buKey === 'all') {
      addSource(franquiaAnalytics.getLossReasons, franquiaAnalytics.toDetailItem);
    }

    const total = Array.from(reasonAgg.values()).reduce((sum, r) => sum + r.count, 0);
    
    const chart = Array.from(reasonAgg.entries())
      .map(([reason, data], index) => ({
        reason,
        count: data.count,
        percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);

    // Build a flat map of reason -> detail items
    const allItems = new Map<string, DetailItem[]>();
    for (const [reason, data] of reasonAgg.entries()) {
      allItems.set(reason, data.items);
    }

    return { chartData: chart, allDetailItems: allItems };
  }, [buKey, modeloAtualAnalytics.getLossReasons, o2TaxAnalytics.getLossReasons, oxyHackerAnalytics.getLossReasons, franquiaAnalytics.getLossReasons]);

  const total = chartData.reduce((acc, item) => acc + item.count, 0);

  const handleReasonClick = (reason: string) => {
    setSelectedReason(reason);
    setSheetOpen(true);
  };

  const getFilteredItems = (): DetailItem[] => {
    if (selectedReason) {
      return allDetailItems.get(selectedReason) || [];
    }
    return Array.from(allDetailItems.values()).flat();
  };

  const filteredItems = getFilteredItems();

  if (isLoading) {
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
        onClick={() => { setSelectedReason(null); setSheetOpen(true); }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            Motivos de Perda
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} negócios analisados • Clique para detalhes
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {chartData.map((entry, index) => (
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
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {chartData.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleReasonClick(item.reason); }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.reason}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={selectedReason ? `Perdidos por: ${selectedReason}` : "Todos os Motivos de Perda"}
        description={`${filteredItems.length} negócios ${selectedReason ? `perdidos por ${selectedReason}` : 'perdidos'}`}
        items={filteredItems}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "company", label: "Contato" },
          { key: "reason", label: "Motivo", format: columnFormatters.reason },
          { key: "value", label: "Valor Perdido", format: columnFormatters.currency },
          { key: "date", label: "Data Perda", format: columnFormatters.date },
        ]}
      />
    </>
  );
}
