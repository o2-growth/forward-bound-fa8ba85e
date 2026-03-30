import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { KpiCardsRow } from "./KpiCardsRow";
import { KpiItem } from "./KpiCard";
import { DrillDownCharts, ChartConfig } from "./DrillDownCharts";

type SortDirection = 'none' | 'desc' | 'asc';

interface SortState {
  column: keyof DetailItem | null;
  direction: SortDirection;
}

export interface DetailItem {
  id: string;
  name: string;
  company?: string;
  phase?: string;
  date?: string;
  value?: number;
  reason?: string;
  revenueRange?: string;
  responsible?: string;
  duration?: number; // Duration in seconds (from "Duração (s)" column)
  product?: string; // CaaS, O2 TAX, Oxy Hacker, Franquia
  mrr?: number; // Valor MRR for monetary indicators
  setup?: number; // Valor Setup for monetary indicators
  pontual?: number; // Valor Pontual for monetary indicators
  closer?: string; // Closer responsável (for filtering)
  sla?: number; // SLA time in minutes (for SLA indicator drill-down)
  sdr?: string; // SDR responsável original (for display in sales drill-down)
  dataAssinatura?: string; // Data de assinatura do contrato (ISO string)
  // Strategic drill-down calculated fields
  diasAteQualificar?: number;    // MQL: Data Entrada - Data Criação
  diasComoMQL?: number;          // RM: tempo antes de agendar
  diasEmProposta?: number;       // Proposta: aging atual
  cicloVenda?: number;           // Venda: Lead → Fechamento
  percentualTotal?: number;      // % deste item no total
  slaStatus?: 'ok' | 'warning' | 'danger'; // Visual do SLA
}

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: DetailItem[];
  columns: {
    key: keyof DetailItem;
    label: string;
    format?: (value: any) => React.ReactNode;
  }[];
  kpis?: KpiItem[];
  charts?: ChartConfig[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function DetailSheet({ open, onOpenChange, title, description, items, columns, kpis, charts }: DetailSheetProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: 'none' });
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const hasAnalytics = (kpis && kpis.length > 0) || (charts && charts.length > 0);

  const handleSort = (columnKey: keyof DetailItem) => {
    setSortState(prev => {
      if (prev.column !== columnKey) {
        return { column: columnKey, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: null, direction: 'none' };
      }
      return { column: columnKey, direction: 'desc' };
    });
  };

  const sortedItems = useMemo(() => {
    if (!sortState.column || sortState.direction === 'none') {
      return items;
    }

    return [...items].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, 'pt-BR');
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
      }

      return sortState.direction === 'desc' ? -comparison : comparison;
    });
  }, [items, sortState]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSortState({ column: null, direction: 'none' });
      setAnalyticsExpanded(true);
    }
    onOpenChange(isOpen);
  };

  const getSortIcon = (columnKey: keyof DetailItem) => {
    if (sortState.column !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortState.direction === 'desc') {
      return <ArrowDown className="h-3 w-3 ml-1" />;
    }
    return <ArrowUp className="h-3 w-3 ml-1" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4 pr-2">
          {hasAnalytics && (
            <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium -ml-2">
                    {analyticsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Análise Visual
                  </Button>
                </CollapsibleTrigger>
                <span className="text-xs text-muted-foreground">
                  {analyticsExpanded ? 'Clique para recolher' : 'Clique para expandir'}
                </span>
              </div>
              <CollapsibleContent>
                {kpis && kpis.length > 0 && <KpiCardsRow kpis={kpis} />}
                {charts && charts.length > 0 && <DrillDownCharts charts={charts} />}
              </CollapsibleContent>
            </Collapsible>
          )}
          <div className="flex items-center justify-between mb-2 mt-2">
            <span className="text-sm text-muted-foreground">
              {sortedItems.length} {sortedItems.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead 
                      key={col.key}
                      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center">
                        {col.label}
                        {getSortIcon(col.key)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[60px] text-center">Pipefy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.format 
                            ? col.format(item[col.key]) 
                            : item[col.key] ?? '-'
                          }
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <a
                          href={`https://app.pipefy.com/open-cards/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
                          title="Abrir no Pipefy"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Pre-configured column formatters
export const columnFormatters = {
  currency: (value: number) => value ? formatCurrency(value) : '-',
  date: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
  phase: (value: string) => value ? (
    <Badge variant="outline" className="font-normal">{value}</Badge>
  ) : '-',
  reason: (value: string) => value ? (
    <Badge variant="secondary" className="font-normal">{value}</Badge>
  ) : '-',
  duration: (seconds: number) => {
    if (!seconds || seconds <= 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  },
  product: (value: string) => {
    if (!value) return '-';
    
    const colorMap: Record<string, string> = {
      'CaaS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'O2 TAX': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'Oxy Hacker': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Franquia': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    
    const colorClass = colorMap[value] || 'bg-gray-100 text-gray-800';
    
    return (
      <Badge className={`font-normal ${colorClass}`}>
        {value}
      </Badge>
    );
  },
  // Strategic drill-down formatters with visual alerts
  agingWithAlert: (days: number) => {
    if (days == null || days < 0) return '-';
    if (days > 30) return <span className="text-destructive font-medium">{days}d 🔴</span>;
    if (days > 14) return <span className="text-amber-600">{days}d ⚠️</span>;
    return <span className="text-chart-2">{days}d</span>;
  },
  slaWithStatus: (minutes: number) => {
    if (minutes == null || minutes < 0) return '-';
    if (minutes <= 30) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">✅ {Math.round(minutes)}m</Badge>;
    if (minutes <= 60) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">⚠️ {Math.round(minutes)}m</Badge>;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">🔴 {hours}h{mins > 0 ? ` ${mins}m` : ''}</Badge>;
  },
  revenueRange: (range: string) => {
    if (!range) return <Badge variant="secondary">-</Badge>;
    const lower = range.toLowerCase();
    const isPremium = lower.includes('50') || lower.includes('100') || lower.includes('acima');
    const isMedium = lower.includes('20') || lower.includes('30') || lower.includes('40');
    
    if (isPremium) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-normal">{range}</Badge>;
    if (isMedium) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-normal">{range}</Badge>;
    return <Badge variant="secondary" className="font-normal">{range}</Badge>;
  },
  diasAteQualificar: (days: number) => {
    if (days == null || days < 0) return '-';
    if (days > 7) return <span className="text-destructive font-medium">{days}d 🔴</span>;
    if (days > 3) return <span className="text-amber-600">{days}d ⚠️</span>;
    return <span className="text-chart-2">{days}d</span>;
  },
  diasAteAgendar: (days: number) => {
    if (days == null || days < 0) return '-';
    if (days > 14) return <span className="text-destructive font-medium">{days}d 🔴</span>;
    if (days > 7) return <span className="text-amber-600">{days}d ⚠️</span>;
    return <span className="text-chart-2">{days}d</span>;
  },
  cicloVenda: (days: number) => {
    if (days == null || days < 0) return '-';
    return `${days}d`;
  },
  percentualTotal: (pct: number) => {
    if (pct == null || pct < 0) return '-';
    if (pct >= 20) return <span className="font-medium text-amber-600">{pct.toFixed(1)}% ⚠️</span>;
    return `${pct.toFixed(1)}%`;
  },
};
