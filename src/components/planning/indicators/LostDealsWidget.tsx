import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";
import { useModeloAtualAnalytics } from "@/hooks/useModeloAtualAnalytics";
import { useExpansaoAnalytics } from "@/hooks/useExpansaoAnalytics";

interface LostDealsWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function LostDealsWidget({ buKey, startDate, endDate }: LostDealsWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const modeloAtualAnalytics = useModeloAtualAnalytics(startDate, endDate);
  const o2TaxAnalytics = useO2TaxAnalytics(startDate, endDate);
  const franquiaAnalytics = useExpansaoAnalytics(startDate, endDate, 'Franquia');
  const oxyHackerAnalytics = useExpansaoAnalytics(startDate, endDate, 'Oxy Hacker');

  const isLoading = modeloAtualAnalytics.isLoading || o2TaxAnalytics.isLoading || franquiaAnalytics.isLoading || oxyHackerAnalytics.isLoading;

  // Aggregate lost deals based on selected BU(s)
  const getAggregatedLostDeals = () => {
    const sources: { getLostDeals: { count: number; totalValue: number; trend: number; cards: any[] }; toDetailItem: (card: any) => DetailItem }[] = [];

    if (buKey === 'modelo_atual' || buKey === 'all') {
      sources.push({ getLostDeals: modeloAtualAnalytics.getLostDeals, toDetailItem: modeloAtualAnalytics.toDetailItem });
    }
    if (buKey === 'o2_tax' || buKey === 'all') {
      sources.push({ getLostDeals: o2TaxAnalytics.getLostDeals, toDetailItem: o2TaxAnalytics.toDetailItem });
    }
    if (buKey === 'oxy_hacker' || buKey === 'all') {
      sources.push({ getLostDeals: oxyHackerAnalytics.getLostDeals, toDetailItem: oxyHackerAnalytics.toDetailItem });
    }
    if (buKey === 'franquia' || buKey === 'all') {
      sources.push({ getLostDeals: franquiaAnalytics.getLostDeals, toDetailItem: franquiaAnalytics.toDetailItem });
    }

    let totalCount = 0;
    let totalValue = 0;
    const allItems: DetailItem[] = [];

    for (const source of sources) {
      totalCount += source.getLostDeals.count;
      totalValue += source.getLostDeals.totalValue;
      allItems.push(...source.getLostDeals.cards.map(source.toDetailItem));
    }

    return { count: totalCount, totalValue, trend: 0, items: allItems };
  };

  const aggregated = getAggregatedLostDeals();

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
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Negócios Perdidos
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{aggregated.count}</span>
            <span className="text-sm text-muted-foreground">perdidos</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-semibold text-destructive">{formatCurrency(aggregated.totalValue)}</span>
          </div>
          {aggregated.trend !== 0 && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium text-chart-2">{aggregated.trend}%</span>
              <span className="text-xs text-muted-foreground">vs período anterior</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Clique para ver detalhes
          </p>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Negócios Perdidos"
        description={`${aggregated.count} negócios perdidos totalizando ${formatCurrency(aggregated.totalValue)}`}
        items={aggregated.items}
        columns={[
          { key: "name", label: "Lead" },
          { key: "company", label: "Empresa" },
          { key: "phase", label: "Fase", format: columnFormatters.phase },
          { key: "reason", label: "Motivo", format: columnFormatters.reason },
          { key: "value", label: "Valor", format: columnFormatters.currency },
          { key: "date", label: "Data", format: columnFormatters.date },
        ]}
      />
    </>
  );
}
