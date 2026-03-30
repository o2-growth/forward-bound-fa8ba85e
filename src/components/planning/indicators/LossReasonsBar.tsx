import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";

interface LostCard {
  id: string;
  titulo: string;
  fase: string;
  faseAtual: string;
  valor: number;
  motivoPerda: string | null;
  closer: string | null;
  sdr: string | null;
  produto: string;
  dataEntrada: Date;
  lastPhaseBeforeLoss: string;
}

interface LossReasonsBarProps {
  lostCards: LostCard[];
  isLoading: boolean;
}

const CHART_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#f43f5e',
];

export function LossReasonsBar({ lostCards, isLoading }: LossReasonsBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const { reasonData, reasonItemsMap } = useMemo(() => {
    const reasonMap = new Map<string, LostCard[]>();

    for (const card of lostCards) {
      const reason = card.motivoPerda || 'Não informado';
      if (!reasonMap.has(reason)) reasonMap.set(reason, []);
      reasonMap.get(reason)!.push(card);
    }

    const total = lostCards.length;
    const data = Array.from(reasonMap.entries())
      .map(([reason, cards], index) => ({
        reason,
        count: cards.length,
        percentage: total > 0 ? Math.round((cards.length / total) * 100) : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);

    const itemsMap = new Map<string, DetailItem[]>();
    for (const [reason, cards] of reasonMap.entries()) {
      itemsMap.set(reason, cards.map(c => ({
        id: c.id,
        name: c.titulo,
        phase: c.lastPhaseBeforeLoss,
        reason: c.motivoPerda || 'Não informado',
        value: c.valor,
        closer: c.closer || undefined,
        responsible: c.sdr || c.closer || undefined,
        product: c.produto,
        date: c.dataEntrada.toISOString().split('T')[0],
      })));
    }

    return { reasonData: data, reasonItemsMap: itemsMap };
  }, [lostCards]);

  const maxCount = Math.max(...reasonData.map(r => r.count), 1);

  const openDrillDown = (reason: string | null) => {
    setSelectedReason(reason);
    setSheetOpen(true);
  };

  const getItems = (): DetailItem[] => {
    if (selectedReason) return reasonItemsMap.get(selectedReason) || [];
    return Array.from(reasonItemsMap.values()).flat();
  };

  if (isLoading) {
    return (
      <Card className="border-orange-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Motivos de Perda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-orange-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Motivos de Perda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lostCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum deal perdido no período</p>
          ) : (
            <div className="flex gap-4">
              {/* Pie chart */}
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonData}
                      dataKey="count"
                      nameKey="reason"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {reasonData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} className="cursor-pointer" onClick={() => openDrillDown(entry.reason)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [`${value} deals`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Reason bars */}
              <div className="flex-1 space-y-1.5">
                {reasonData.map((item) => (
                  <button
                    key={item.reason}
                    onClick={() => openDrillDown(item.reason)}
                    className="w-full flex items-center gap-2 group hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground truncate w-36 shrink-0">{item.reason}</span>
                    <div className="flex-1 h-4 bg-muted/30 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all group-hover:opacity-80"
                        style={{
                          width: `${Math.max(Math.round((item.count / maxCount) * 100), 5)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right shrink-0">
                      {item.count} ({item.percentage}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={selectedReason ? `Perdidos: ${selectedReason}` : 'Todos os Motivos de Perda'}
        description={`${getItems().length} deals perdidos`}
        items={getItems()}
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'product', label: 'Produto' },
          { key: 'phase', label: 'Última Fase' },
          { key: 'reason', label: 'Motivo' },
          { key: 'value', label: 'Valor', format: columnFormatters.currency },
          { key: 'closer', label: 'Closer' },
          { key: 'date', label: 'Data' },
        ]}
      />
    </>
  );
}
