import { useState, useEffect, useMemo, useRef } from 'react';
import { useMonetaryMetas, BuType, MonthType, BU_LABELS, isPontualOnlyBU, MONTHS } from '@/hooks/useMonetaryMetas';
import { useMrrBase } from '@/hooks/useMrrBase';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Info } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { BU_LABELS as BU_LABEL_MAP } from '@/hooks/useMonetaryMetas';
import { DistributionBar } from './DistributionBar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const TARGET_TOTAL = 33_306_500;

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
};

const DEFAULT_TICKETS: Record<BuType, number> = {
  modelo_atual: 400_000,
  o2_tax: 15_000,
  oxy_hacker: 54_000,
  franquia: 140_000,
};

export function MonetaryMetasTab() {
  const { toast } = useToast();
  const { metas, isLoading, bulkUpdateMetas, BUS, MONTHS } = useMonetaryMetas();
  const { getMrrBaseForMonth, isLoading: mrrLoading } = useMrrBase();
  
  const { logAction } = useAuditLogs();

  const [selectedBu, setSelectedBu] = useState<BuType>('modelo_atual');
  
  const [localFaturamento, setLocalFaturamento] = useState<Record<string, Record<string, number>>>({});
  const [localTickets, setLocalTickets] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingTicket, setEditingTicket] = useState<string | null>(null);
  const [editingTicketValue, setEditingTicketValue] = useState<string>('');
  
  // Distribution state
  const [editedMonths, setEditedMonths] = useState<Set<string>>(new Set());
  const [previousBuTotals, setPreviousBuTotals] = useState<Record<string, number>>({});

  const dbSnapshot = useRef<{ fat: Record<string, Record<string, number>>; tickets: Record<string, number> }>({ fat: {}, tickets: {} });

  // Initialize from DB
  useEffect(() => {
    if (metas.length > 0) {
      const fatMap: Record<string, Record<string, number>> = {};
      const ticketMap: Record<string, number> = {};

      BUS.forEach(bu => {
        fatMap[bu] = {};
        let foundTicket = 0;
        MONTHS.forEach(month => {
          const meta = metas.find(m => m.bu === bu && m.month === month);
          if (meta) {
            fatMap[bu][month] = Number(meta.faturamento) || 0;
            if (Number(meta.ticket_medio) > 0) foundTicket = Number(meta.ticket_medio);
          } else {
            fatMap[bu][month] = 0;
          }
        });
        ticketMap[bu] = foundTicket > 0 ? foundTicket : DEFAULT_TICKETS[bu];
      });

      setLocalFaturamento(fatMap);
      setLocalTickets(ticketMap);
      dbSnapshot.current = { fat: JSON.parse(JSON.stringify(fatMap)), tickets: { ...ticketMap } };
      // Store initial totals per BU
      const totals: Record<string, number> = {};
      BUS.forEach(bu => {
        totals[bu] = MONTHS.reduce((s, m) => s + (fatMap[bu]?.[m] ?? 0), 0);
      });
      setPreviousBuTotals(totals);
      setHasChanges(false);
      setEditedMonths(new Set());
    } else {
      const fatMap: Record<string, Record<string, number>> = {};
      const ticketMap: Record<string, number> = {};
      BUS.forEach(bu => {
        fatMap[bu] = {};
        MONTHS.forEach(month => { fatMap[bu][month] = 0; });
        ticketMap[bu] = DEFAULT_TICKETS[bu];
      });
      setLocalFaturamento(fatMap);
      setLocalTickets(ticketMap);
    }
  }, [metas]);

  const getFaturamento = (bu: string, month: string) => localFaturamento[bu]?.[month] ?? 0;
  const getTicket = (bu: string) => localTickets[bu] ?? 0;
  const getVendas = (bu: string, month: string) => {
    const ticket = getTicket(bu);
    if (ticket <= 0) return 0;
    return Math.round(getFaturamento(bu, month) / ticket);
  };

  const getBuMonthlyTotal = (bu: string) => MONTHS.reduce((s, m) => s + getFaturamento(bu, m), 0);
  const getBuVendasTotal = (bu: string) => MONTHS.reduce((s, m) => s + getVendas(bu, m), 0);

  const consolidatedTotal = useMemo(() => {
    return BUS.reduce((sum, bu) => sum + getBuMonthlyTotal(bu), 0);
  }, [localFaturamento, localTickets]);

  const diff = consolidatedTotal - TARGET_TOTAL;
  const isOnTarget = Math.abs(diff) < 1000;
  const progressPct = Math.min((consolidatedTotal / TARGET_TOTAL) * 100, 100);

  // Distribution difference for selected BU
  const buDifference = useMemo(() => {
    const prev = previousBuTotals[selectedBu] ?? 0;
    const current = getBuMonthlyTotal(selectedBu);
    return prev - current; // positive = user reduced, needs to add back
  }, [localFaturamento, previousBuTotals, selectedBu]);

  const showDistributionBar = Math.abs(buDifference) >= 1;

  const updateFaturamento = (bu: string, month: string, value: number) => {
    setLocalFaturamento(prev => ({
      ...prev,
      [bu]: { ...prev[bu], [month]: value },
    }));
    setEditedMonths(prev => new Set(prev).add(month));
    setHasChanges(true);
  };

  const updateTicket = (bu: string, value: number) => {
    setLocalTickets(prev => ({ ...prev, [bu]: value }));
    setHasChanges(true);
  };

  // Distribution handlers
  const distributeToMonths = (targetMonths: MonthType[]) => {
    if (targetMonths.length === 0) return;
    const perMonth = Math.floor(buDifference / targetMonths.length);
    const remainder = buDifference - perMonth * targetMonths.length;

    setLocalFaturamento(prev => {
      const buData = { ...prev[selectedBu] };
      targetMonths.forEach((m, i) => {
        const extra = i === targetMonths.length - 1 ? remainder : 0;
        buData[m] = (buData[m] ?? 0) + perMonth + extra;
      });
      return { ...prev, [selectedBu]: buData };
    });
    setHasChanges(true);
  };

  const handleDistributeRemaining = () => {
    const remaining = MONTHS.filter(m => !editedMonths.has(m));
    distributeToMonths(remaining);
  };

  const handleDistributePeriod = (months: MonthType[]) => {
    distributeToMonths(months);
  };

  const handleDiscard = () => {
    setLocalFaturamento(JSON.parse(JSON.stringify(dbSnapshot.current.fat)));
    setLocalTickets({ ...dbSnapshot.current.tickets });
    setEditedMonths(new Set());
    setHasChanges(false);
  };

  const handleSave = async () => {
    const updates = BUS.flatMap(bu => {
      const ticket = getTicket(bu);
      const pontualOnly = isPontualOnlyBU(bu);
      return MONTHS.map(month => {
        const fat = getFaturamento(bu, month);
        const vendas = ticket > 0 ? Math.round(fat / ticket) : 0;
        return {
          bu,
          month,
          vendas,
          ticket_medio: ticket,
          faturamento: fat,
          mrr: pontualOnly ? 0 : Math.round(fat * 0.25),
          setup: pontualOnly ? 0 : Math.round(fat * 0.6),
          pontual: pontualOnly ? fat : Math.round(fat * 0.15),
        };
      });
    });

    try {
      await bulkUpdateMetas.mutateAsync(updates);
      
      const oldFat = dbSnapshot.current.fat;
      const oldTickets = dbSnapshot.current.tickets;
      for (const bu of BUS) {
        const buLabel = BU_LABEL_MAP[bu] || bu;
        const oldT = oldTickets[bu] ?? 0;
        const newT = getTicket(bu);
        if (oldT !== newT) {
          await logAction('monetary_meta', `${buLabel}: ticket médio de R$ ${formatCompact(oldT)} para R$ ${formatCompact(newT)}`, { bu, old_value: oldT, new_value: newT });
        }
        for (const month of MONTHS) {
          const oldV = oldFat[bu]?.[month] ?? 0;
          const newV = getFaturamento(bu, month);
          if (oldV !== newV) {
            await logAction('monetary_meta', `${buLabel} ${month}: faturamento de ${formatCurrency(oldV)} para ${formatCurrency(newV)}`, { bu, month, old_value: oldV, new_value: newV });
          }
        }
      }
      
      dbSnapshot.current = {
        fat: JSON.parse(JSON.stringify(localFaturamento)),
        tickets: { ...localTickets },
      };
      
      // Update previous totals after save
      const totals: Record<string, number> = {};
      BUS.forEach(bu => {
        totals[bu] = MONTHS.reduce((s, m) => s + (localFaturamento[bu]?.[m] ?? 0), 0);
      });
      setPreviousBuTotals(totals);
      setEditedMonths(new Set());
      
      toast({ title: 'Metas salvas com sucesso!' });
      setHasChanges(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar metas' });
    }
  };

  const getMetrics = (bu: string, month: string) => {
    const fat = getFaturamento(bu, month);
    const pontualOnly = isPontualOnlyBU(bu as BuType);
    return {
      faturamento: fat,
      mrr: pontualOnly ? 0 : Math.round(fat * 0.25),
      setup: pontualOnly ? 0 : Math.round(fat * 0.6),
      pontual: pontualOnly ? fat : Math.round(fat * 0.15),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pontualOnly = isPontualOnlyBU(selectedBu);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">
          Metas Monetárias por BU
        </h2>
        <p className="text-muted-foreground">
          Defina o faturamento (meta) e ticket médio por BU. O sistema calcula vendas e métricas automaticamente.
        </p>
      </div>

      {/* Consolidated Target Validation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Meta Consolidada</span>
            <span className="text-sm font-medium">
              {formatCurrency(consolidatedTotal)} / {formatCurrency(TARGET_TOTAL)}
            </span>
          </div>
          <Progress 
            value={progressPct} 
            className={`h-3 ${isOnTarget ? '[&>div]:bg-green-500' : diff > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'}`}
          />
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${isOnTarget ? 'text-green-600' : 'text-destructive'}`}>
              {isOnTarget 
                ? '✅ Meta atingida' 
                : diff > 0 
                  ? `⚠️ Excede em ${formatCurrency(diff)}` 
                  : `❌ Faltam ${formatCurrency(Math.abs(diff))}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {BUS.map(bu => `${BU_LABELS[bu]}: ${formatCurrency(getBuMonthlyTotal(bu))}`).join(' | ')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* BU Selector + Ticket + Save */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Unidade de Negócio</label>
                <Select value={selectedBu} onValueChange={(v) => setSelectedBu(v as BuType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUS.map(bu => (
                      <SelectItem key={bu} value={bu}>{BU_LABELS[bu]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Ticket Médio</label>
                <Input
                  type="text"
                  value={
                    editingTicket === selectedBu
                      ? editingTicketValue
                      : `R$ ${formatCompact(getTicket(selectedBu))}`
                  }
                  onFocus={() => {
                    setEditingTicket(selectedBu);
                    const v = getTicket(selectedBu);
                    setEditingTicketValue(v > 0 ? v.toString() : '');
                  }}
                  onChange={(e) => setEditingTicketValue(e.target.value)}
                  onBlur={() => {
                    const cleaned = editingTicketValue.replace(/[^\d]/g, '');
                    updateTicket(selectedBu, parseInt(cleaned) || 0);
                    setEditingTicket(null);
                  }}
                  className="w-[160px] h-9"
                />
              </div>

              <div className="text-sm text-muted-foreground pt-5">
                Total BU: <strong>{formatCurrency(getBuMonthlyTotal(selectedBu))}</strong>
                {' '}({getBuVendasTotal(selectedBu)} vendas)
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || bulkUpdateMetas.isPending}
            >
              {bulkUpdateMetas.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Todas as BUs
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Métrica</TableHead>
                  {MONTHS.map((month) => (
                    <TableHead 
                      key={month} 
                      className={`text-center min-w-[90px] ${editedMonths.has(month) ? 'bg-primary/10' : ''}`}
                    >
                      {month}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] bg-muted/30">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Faturamento Row - EDITABLE */}
                <TableRow className="bg-primary/5">
                  <TableCell className="sticky left-0 bg-primary/5 z-10 font-semibold">
                    🎯 Meta (Fat.)
                  </TableCell>
                  {MONTHS.map((month) => {
                    const cellKey = `fat-${month}`;
                    const value = getFaturamento(selectedBu, month);
                    return (
                      <TableCell key={cellKey} className={`text-center p-1 ${editedMonths.has(month) ? 'bg-primary/10' : ''}`}>
                        <Input
                          type="text"
                          value={
                            editingCell === cellKey ? editingValue : (value > 0 ? formatCompact(value) : '')
                          }
                          placeholder="0"
                          onFocus={() => {
                            setEditingCell(cellKey);
                            setEditingValue(value > 0 ? value.toString() : '');
                          }}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            const cleaned = editingValue.replace(/[^\d]/g, '');
                            const parsed = parseInt(cleaned) || 0;
                            updateFaturamento(selectedBu, month, parsed);
                            setEditingCell(null);
                          }}
                          className="w-20 h-8 text-center text-sm font-semibold"
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/30">
                    {formatCurrency(getBuMonthlyTotal(selectedBu))}
                  </TableCell>
                </TableRow>


                {/* Vendas Row */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">Vendas</TableCell>
                  {MONTHS.map((month) => (
                    <TableCell key={`vendas-${month}`} className="text-center text-sm">
                      {getVendas(selectedBu, month)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold bg-muted/30">
                    {getBuVendasTotal(selectedBu)}
                  </TableCell>
                </TableRow>

                {!pontualOnly && (
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-muted-foreground">MRR (25%)</TableCell>
                    {MONTHS.map((month) => (
                      <TableCell key={`mrr-${month}`} className="text-center text-sm text-muted-foreground">
                        {formatCompact(getMetrics(selectedBu, month).mrr)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-medium bg-muted/30">
                      {formatCurrency(MONTHS.reduce((s, m) => s + getMetrics(selectedBu, m).mrr, 0))}
                    </TableCell>
                  </TableRow>
                )}

                {!pontualOnly && (
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-muted-foreground">Setup (60%)</TableCell>
                    {MONTHS.map((month) => (
                      <TableCell key={`setup-${month}`} className="text-center text-sm text-muted-foreground">
                        {formatCompact(getMetrics(selectedBu, month).setup)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-sm font-medium bg-muted/30">
                      {formatCurrency(MONTHS.reduce((s, m) => s + getMetrics(selectedBu, m).setup, 0))}
                    </TableCell>
                  </TableRow>
                )}

                <TableRow>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium text-muted-foreground">
                    Pontual {pontualOnly ? '(100%)' : '(15%)'}
                  </TableCell>
                  {MONTHS.map((month) => (
                    <TableCell key={`pont-${month}`} className="text-center text-sm text-muted-foreground">
                      {formatCompact(getMetrics(selectedBu, month).pontual)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center text-sm font-medium bg-muted/30">
                    {formatCurrency(MONTHS.reduce((s, m) => s + getMetrics(selectedBu, m).pontual, 0))}
                  </TableCell>
                </TableRow>

                {/* Separator */}
                <TableRow>
                  <TableCell colSpan={MONTHS.length + 2} className="p-0">
                    <div className="border-t-2 border-dashed border-muted-foreground/30" />
                  </TableCell>
                </TableRow>

                {/* Realizado Row - MRR Base (total empresa, não por BU) */}
                <TableRow className="bg-accent/30">
                  <TableCell className="sticky left-0 bg-accent/30 z-10 font-semibold">
                    ✅ Realizado
                    {mrrLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                    <span className="block text-[10px] text-muted-foreground font-normal">Total empresa</span>
                  </TableCell>
                  {MONTHS.map((month) => {
                    const realized = getMrrBaseForMonth(month, 2026);
                    const hasData = realized > 0;
                    return (
                      <TableCell key={`real-${month}`} className="text-center text-sm font-medium">
                        {hasData ? formatCompact(realized) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/30">
                    {formatCurrency(MONTHS.reduce((s, m) => s + getMrrBaseForMonth(m, 2026), 0))}
                  </TableCell>
                </TableRow>

                {/* Gap Row - Realizado vs Meta consolidada (todas as BUs) */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background z-10 font-semibold">
                    📊 Gap
                    <span className="block text-[10px] text-muted-foreground font-normal">Real. − Meta total</span>
                  </TableCell>
                  {MONTHS.map((month) => {
                    const realized = getMrrBaseForMonth(month, 2026);
                    const metaTotal = BUS.reduce((s, bu) => s + getFaturamento(bu, month), 0);
                    const hasData = realized > 0;
                    const gap = realized - metaTotal;
                    return (
                      <TableCell key={`gap-${month}`} className="text-center text-sm font-semibold">
                        {hasData ? (
                          <span className={gap >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                            {gap >= 0 ? '+' : ''}{formatCompact(gap)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold bg-muted/30">
                    {(() => {
                      const totalRealized = MONTHS.reduce((s, m) => s + getMrrBaseForMonth(m, 2026), 0);
                      const totalMeta = BUS.reduce((sum, bu) => sum + getBuMonthlyTotal(bu), 0);
                      const totalGap = totalRealized - totalMeta;
                      const hasAnyData = MONTHS.some(m => getMrrBaseForMonth(m, 2026) > 0);
                      return hasAnyData ? (
                        <span className={totalGap >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                          {totalGap >= 0 ? '+' : ''}{formatCurrency(totalGap)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>;
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Distribution floating bar */}
      {showDistributionBar && (
        <DistributionBar
          buLabel={BU_LABELS[selectedBu]}
          difference={buDifference}
          editedMonths={editedMonths}
          onDistributeRemaining={handleDistributeRemaining}
          onDistributePeriod={handleDistributePeriod}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
