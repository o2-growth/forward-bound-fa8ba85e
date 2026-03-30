import { useMemo, useState } from "react";
import { TrendingUp, FileText, Zap, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DetailItem } from "./DetailSheet";

interface TcvHeroBannerProps {
  vendaItems: DetailItem[];
}

export function TcvHeroBanner({ vendaItems }: TcvHeroBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
    const totalMrrAnual = vendaItems.reduce((s, c) => s + (c.mrr || 0) * 12, 0);
    const totalSetup = vendaItems.reduce((s, c) => s + (c.setup || 0), 0);
    const totalPontual = vendaItems.reduce((s, c) => s + (c.pontual || 0), 0);
    const tcv = totalMrrAnual + totalSetup + totalPontual;
    const total = totalMrrAnual + totalSetup + totalPontual;
    const pctMrr = total > 0 ? (totalMrrAnual / total) * 100 : 0;
    const pctSetup = total > 0 ? (totalSetup / total) * 100 : 0;
    const pctPontual = total > 0 ? (totalPontual / total) * 100 : 0;
    return { tcv, totalMrrAnual, totalSetup, totalPontual, pctMrr, pctSetup, pctPontual };
  }, [vendaItems]);

  if (vendaItems.length === 0) return null;

  const fmt = (v: number) =>
    v >= 1_000_000
      ? `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
      : v >= 1_000
        ? `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}k`
        : `R$ ${v.toFixed(0)}`;

  const breakdownCards = [
    { label: "MRR Anualizado", value: stats.totalMrrAnual, pct: stats.pctMrr, icon: TrendingUp, color: "text-chart-1" },
    { label: "Setup", value: stats.totalSetup, pct: stats.pctSetup, icon: FileText, color: "text-chart-2" },
    { label: "Pontual", value: stats.totalPontual, pct: stats.pctPontual, icon: Zap, color: "text-chart-3" },
  ];

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-display text-base font-semibold text-foreground">
                Faturamento no Período
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-5">
            {/* Main TCV value */}
            <div className="text-center py-2">
              <span className="font-display text-5xl font-bold tracking-tight text-foreground">
                {fmt(stats.tcv)}
              </span>
            </div>

            {/* Distribution bar */}
            <div className="space-y-2">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                {stats.pctMrr > 0 && (
                  <div
                    className="h-full bg-chart-1 transition-all duration-500"
                    style={{ width: `${stats.pctMrr}%` }}
                  />
                )}
                {stats.pctSetup > 0 && (
                  <div
                    className="h-full bg-chart-2 transition-all duration-500"
                    style={{ width: `${stats.pctSetup}%` }}
                  />
                )}
                {stats.pctPontual > 0 && (
                  <div
                    className="h-full bg-chart-3 transition-all duration-500"
                    style={{ width: `${stats.pctPontual}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-1 inline-block" />
                  MRR x12 ({Math.round(stats.pctMrr)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-2 inline-block" />
                  Setup ({Math.round(stats.pctSetup)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-3 inline-block" />
                  Pontual ({Math.round(stats.pctPontual)}%)
                </span>
              </div>
            </div>

            {/* Breakdown grid */}
            <div className="grid grid-cols-3 gap-3">
              {breakdownCards.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-4"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-display text-xl font-bold text-foreground">
                    {fmt(item.value)}
                  </span>
                  {item.pct !== null && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(item.pct)}% do TCV
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
