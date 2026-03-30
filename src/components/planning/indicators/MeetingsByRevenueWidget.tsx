import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ExternalLink, Loader2 } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";
import { useO2TaxAnalytics } from "@/hooks/useO2TaxAnalytics";

interface MeetingsByRevenueWidgetProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

// Mock data for non-O2 TAX BUs
const mockData = [
  { range: "Até R$ 50k", count: 12, color: "hsl(var(--chart-1))" },
  { range: "R$ 50k - 200k", count: 18, color: "hsl(var(--chart-2))" },
  { range: "R$ 200k - 1M", count: 8, color: "hsl(var(--chart-3))" },
  { range: "Acima de 1M", count: 5, color: "hsl(var(--chart-4))" },
];

const mockMeetingsByRevenue: DetailItem[] = [
  { id: "1", name: "Tech Solutions", company: "João Silva", revenueRange: "R$ 50k - 200k", date: "2026-01-15", responsible: "Carlos", phase: "Agendada" },
  { id: "2", name: "Inovação Digital", company: "Maria Santos", revenueRange: "R$ 200k - 1M", date: "2026-01-14", responsible: "Ana Paula", phase: "Realizada" },
  { id: "3", name: "Startup XYZ", company: "Pedro Costa", revenueRange: "Até R$ 50k", date: "2026-01-13", responsible: "Carlos", phase: "Agendada" },
];

export function MeetingsByRevenueWidget({ buKey, startDate, endDate }: MeetingsByRevenueWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  
  const isO2Tax = buKey === 'o2_tax';
  const { getMeetingsByRevenue, toDetailItem, isLoading } = useO2TaxAnalytics(startDate, endDate);
  
  const chartData = isO2Tax ? getMeetingsByRevenue : mockData;
  const total = chartData.reduce((acc, item) => acc + item.count, 0);

  const handleBarClick = (data: any) => {
    setSelectedRange(data.range);
    setSheetOpen(true);
  };

  const getFilteredItems = (): DetailItem[] => {
    if (isO2Tax) {
      const filtered = selectedRange 
        ? getMeetingsByRevenue.find(r => r.range === selectedRange)?.cards || []
        : getMeetingsByRevenue.flatMap(r => r.cards);
      return filtered.map(toDetailItem);
    }
    return selectedRange 
      ? mockMeetingsByRevenue.filter(item => item.revenueRange === selectedRange)
      : mockMeetingsByRevenue;
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
            Reuniões por Faixa de Faturamento
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {total} reuniões agendadas • Clique para detalhes
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
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
                  formatter={(value: number) => [value, "Reuniões"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} className="cursor-pointer">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={selectedRange ? `Reuniões - ${selectedRange}` : "Todas as Reuniões por Faturamento"}
        description={`${filteredItems.length} reuniões ${selectedRange ? `na faixa ${selectedRange}` : 'agendadas'}`}
        items={filteredItems}
        columns={[
          { key: "name", label: "Empresa" },
          { key: "company", label: "Contato" },
          { key: "revenueRange", label: "Faixa Faturamento" },
          { key: "phase", label: "Status", format: columnFormatters.phase },
          { key: "date", label: "Data", format: columnFormatters.date },
          { key: "responsible", label: "Responsável" },
        ]}
      />
    </>
  );
}
