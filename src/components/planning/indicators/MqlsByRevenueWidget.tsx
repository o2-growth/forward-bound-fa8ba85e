import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";

interface MqlsByRevenueWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

// Mock data for non-O2 TAX BUs
const mockData = [
  { range: "Até R$ 50k", count: 35, percentage: 40, color: "hsl(var(--chart-1))" },
  { range: "R$ 50k - 200k", count: 28, percentage: 32, color: "hsl(var(--chart-2))" },
  { range: "R$ 200k - 1M", count: 18, percentage: 21, color: "hsl(var(--chart-3))" },
  { range: "Acima de 1M", count: 6, percentage: 7, color: "hsl(var(--chart-4))" },
];

const mockMqlsByRevenue: DetailItem[] = [
  { id: "1", name: "Tech Solutions", company: "João Silva", revenueRange: "R$ 50k - 200k", date: "2026-01-15", responsible: "Marketing" },
  { id: "2", name: "Inovação Digital", company: "Maria Santos", revenueRange: "R$ 200k - 1M", date: "2026-01-14", responsible: "Marketing" },
  { id: "3", name: "Startup XYZ", company: "Pedro Costa", revenueRange: "Até R$ 50k", date: "2026-01-13", responsible: "SDR" },
];

export function MqlsByRevenueWidget({ buKey, startDate, endDate }: MqlsByRevenueWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  
  const isO2Tax = buKey === 'o2_tax';
  const { getMqlsByRevenue, toDetailItem, isLoading } = useO2TaxAnalytics(startDate, endDate);
  
  const chartData = isO2Tax ? getMqlsByRevenue : mockData;
  const total = chartData.reduce((acc, item) => acc + item.count, 0);

  const handleBarClick = (data: any) => {
    setSelectedRange(data.range);
    setSheetOpen(true);
  };

  const getFilteredItems = (): DetailItem[] => {
    if (isO2Tax) {
      const filtered = selectedRange 
        ? getMqlsByRevenue.find(r => r.range === selectedRange)?.cards || []
        : getMqlsByRevenue.flatMap(r => r.cards);
      return filtered.map(toDetailItem);
    }
    return selectedRange 
      ? mockMqlsByRevenue.filter(item => item.revenueRange === selectedRange)
      : mockMqlsByRevenue;
  };

  const filteredItems = getFilteredItems();

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
        onClick={() => { setSelectedRange(null); setSheetOpen(true); }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            MQLs por Faixa de Faturamento
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} MQLs qualificados • Clique para detalhes
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}
              >
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  width={90}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))", 
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))"
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const item = chartData.find(d => d.count === value);
                    return [`${value} (${item?.percentage}%)`, "MQLs"];
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} className="cursor-pointer">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {chartData.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-70 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleBarClick(item); }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={selectedRange ? `MQLs - ${selectedRange}` : "Todos os MQLs por Faturamento"}
        description={`${filteredItems.length} MQLs ${selectedRange ? `na faixa ${selectedRange}` : 'qualificados'}`}
        items={filteredItems}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "company", label: "Contato" },
          { key: "revenueRange", label: "Faixa Faturamento" },
          { key: "date", label: "Data Qualificação", format: columnFormatters.date },
          { key: "responsible", label: "Origem" },
        ]}
      />
    </>
  );
}
