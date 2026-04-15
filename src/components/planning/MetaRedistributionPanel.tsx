import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  ArrowRightLeft,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMetaRedistribution,
  ANNUAL_TARGET,
  computeAnnualTarget,
  type RedistributionChangeRow,
} from '@/hooks/useMetaRedistribution';
import { BUS, MONTHS, BU_LABELS, type BuType, type MonthType, isPontualOnlyBU } from '@/hooks/useMonetaryMetas';

interface MetaRedistributionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dreByBU: Record<string, Record<string, number>>;
  isAdmin: boolean;
  year?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function MetaRedistributionPanel({
  open,
  onOpenChange,
  dreByBU,
  isAdmin,
  year = 2026,
}: MetaRedistributionPanelProps) {
  const {
    currentGrid,
    currentTotals,
    annualTarget,
    pendingChanges,
    addChange,
    removeChange,
    clearChanges,
    calculateNewTotals,
    validateTotal,
    saveSession,
    isSaving,
    sessions,
    isLoadingSessions,
    getSessionChanges,
    rollbackSession,
    isRollingBack,
  } = useMetaRedistribution(year);

  const [activeTab, setActiveTab] = useState('gap');
  const [fromBU, setFromBU] = useState<BuType | ''>('');
  const [fromMonth, setFromMonth] = useState<MonthType | ''>('');
  const [toBU, setToBU] = useState<BuType | ''>('');
  const [toMonth, setToMonth] = useState<MonthType | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [rollbackId, setRollbackId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionChanges, setSessionChanges] = useState<Record<string, RedistributionChangeRow[]>>({});

  // Multi-month selection state (Improvement 2)
  const [fromMode, setFromMode] = useState<'single' | 'quarter' | 'range'>('single');
  const [fromQuarter, setFromQuarter] = useState<string>('');
  const [fromMonthEnd, setFromMonthEnd] = useState<MonthType | ''>('');

  // Destination multi-month state
  const [toMode, setToMode] = useState<'single' | 'quarter' | 'range'>('single');
  const [toQuarter, setToQuarter] = useState<string>('');
  const [toMonthEnd, setToMonthEnd] = useState<MonthType | ''>('');
  const [toDistMethod, setToDistMethod] = useState<'equal' | 'proportional'>('equal');

  // Clear-all confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // BU-to-BU redistribution state (Improvement 3)
  const [buRedistFromBU, setBuRedistFromBU] = useState<BuType | ''>('');
  const [buRedistToBU, setBuRedistToBU] = useState<BuType | ''>('');

  const validation = validateTotal();
  const newGrid = useMemo(() => calculateNewTotals(), [calculateNewTotals]);

  // Quarter-to-months mapping
  const QUARTER_MONTHS: Record<string, MonthType[]> = {
    Q1: ['Jan', 'Fev', 'Mar'] as MonthType[],
    Q2: ['Abr', 'Mai', 'Jun'] as MonthType[],
    Q3: ['Jul', 'Ago', 'Set'] as MonthType[],
    Q4: ['Out', 'Nov', 'Dez'] as MonthType[],
  };

  // Get selected "from" months based on mode
  const selectedFromMonths = useMemo((): MonthType[] => {
    if (fromMode === 'single') {
      return fromMonth ? [fromMonth as MonthType] : [];
    }
    if (fromMode === 'quarter') {
      return fromQuarter ? (QUARTER_MONTHS[fromQuarter] || []) : [];
    }
    if (fromMode === 'range' && fromMonth && fromMonthEnd) {
      const startIdx = MONTHS.indexOf(fromMonth as MonthType);
      const endIdx = MONTHS.indexOf(fromMonthEnd as MonthType);
      if (startIdx >= 0 && endIdx >= 0 && endIdx >= startIdx) {
        return MONTHS.slice(startIdx, endIdx + 1);
      }
    }
    return [];
  }, [fromMode, fromMonth, fromQuarter, fromMonthEnd]);

  // Total gap across selected from months
  const totalSelectedGap = useMemo(() => {
    if (!fromBU || selectedFromMonths.length === 0) return 0;
    return selectedFromMonths.reduce((sum, m) => {
      const meta = currentGrid[fromBU]?.[m] || 0;
      const dre = dreByBU[fromBU]?.[m] || 0;
      const gap = meta - dre;
      return sum + (gap > 0 ? gap : 0);
    }, 0);
  }, [fromBU, selectedFromMonths, currentGrid, dreByBU]);

  // Get selected "to" months based on toMode
  const selectedToMonths = useMemo((): MonthType[] => {
    if (toMode === 'single') {
      return toMonth ? [toMonth as MonthType] : [];
    }
    if (toMode === 'quarter') {
      return toQuarter ? (QUARTER_MONTHS[toQuarter] || []) : [];
    }
    if (toMode === 'range' && toMonth && toMonthEnd) {
      const startIdx = MONTHS.indexOf(toMonth as MonthType);
      const endIdx = MONTHS.indexOf(toMonthEnd as MonthType);
      if (startIdx >= 0 && endIdx >= 0 && endIdx >= startIdx) {
        return MONTHS.slice(startIdx, endIdx + 1);
      }
    }
    return [];
  }, [toMode, toMonth, toQuarter, toMonthEnd]);

  // Distribute a total amount across destination months
  const distributeToMonthsFn = (totalAmount: number, destMonths: MonthType[], method: 'equal' | 'proportional'): { month: MonthType; amount: number }[] => {
    if (destMonths.length === 0) return [];
    if (method === 'equal') {
      const perMonth = Math.round(totalAmount / destMonths.length);
      const remainder = totalAmount - perMonth * destMonths.length;
      return destMonths.map((m, i) => ({
        month: m,
        amount: perMonth + (i === 0 ? remainder : 0),
      }));
    }
    // Proportional: distribute based on existing meta values in destination
    if (!toBU) return destMonths.map((m) => ({ month: m, amount: Math.round(totalAmount / destMonths.length) }));
    const destMetas = destMonths.map((m) => currentGrid[toBU]?.[m] || 0);
    const destTotal = destMetas.reduce((s, v) => s + v, 0);
    if (destTotal === 0) {
      // fallback to equal
      const perMonth = Math.round(totalAmount / destMonths.length);
      return destMonths.map((m) => ({ month: m, amount: perMonth }));
    }
    let allocated = 0;
    return destMonths.map((m, i) => {
      const meta = currentGrid[toBU]?.[m] || 0;
      const share = i === destMonths.length - 1
        ? totalAmount - allocated
        : Math.round((meta / destTotal) * totalAmount);
      allocated += share;
      return { month: m, amount: share };
    });
  };

  // Cross-field warning: warn when from and to BU use different fields
  const crossFieldWarning = useMemo(() => {
    if (!fromBU || !toBU) return false;
    return isPontualOnlyBU(fromBU as BuType) !== isPontualOnlyBU(toBU as BuType);
  }, [fromBU, toBU]);

  // BU-to-BU redistribution preview
  const buRedistPreview = useMemo(() => {
    if (!buRedistFromBU) return [];
    return MONTHS.map((month) => {
      const meta = currentGrid[buRedistFromBU]?.[month] || 0;
      const dre = dreByBU[buRedistFromBU]?.[month] || 0;
      const gap = meta - dre;
      return { month, meta, dre, gap: gap > 0 ? gap : 0 };
    }).filter((r) => r.gap > 0);
  }, [buRedistFromBU, currentGrid, dreByBU]);

  const buRedistTotal = useMemo(() => buRedistPreview.reduce((s, r) => s + r.gap, 0), [buRedistPreview]);

  // Handle BU-to-BU redistribution
  const handleBuRedist = () => {
    if (!buRedistFromBU || !buRedistToBU) {
      toast.error('Selecione as BUs de origem e destino');
      return;
    }
    if (buRedistFromBU === buRedistToBU) {
      toast.error('BU de origem e destino devem ser diferentes');
      return;
    }
    if (buRedistPreview.length === 0) {
      toast.error('Nenhum gap encontrado na BU de origem');
      return;
    }
    for (const row of buRedistPreview) {
      addChange(buRedistFromBU as BuType, row.month as MonthType, buRedistToBU as BuType, row.month as MonthType, row.gap);
    }
    toast.success(`${buRedistPreview.length} redistribuições adicionadas`);
    setBuRedistFromBU('');
    setBuRedistToBU('');
    setActiveTab('redistribute');
  };

  // Select a gap cell to start redistribution
  const handleSelectGap = (bu: BuType, month: MonthType) => {
    setFromBU(bu);
    setFromMonth(month);
    const gap = (currentGrid[bu]?.[month] || 0) - (dreByBU[bu]?.[month] || 0);
    if (gap > 0) {
      setAmount(String(Math.round(gap)));
    }
    setActiveTab('redistribute');
  };

  // Add pending change (supports multi-month source AND multi-month destination)
  const handleAddChange = () => {
    if (!fromBU || !toBU) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (selectedFromMonths.length === 0) {
      toast.error('Selecione o(s) mês(es) de origem');
      return;
    }
    if (selectedToMonths.length === 0) {
      toast.error('Selecione o(s) mês(es) de destino');
      return;
    }

    if (fromMode === 'single' && toMode === 'single') {
      // Simple case: single from -> single to
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('Valor deve ser maior que zero');
        return;
      }
      addChange(fromBU as BuType, fromMonth as MonthType, toBU as BuType, toMonth as MonthType, numAmount);
      toast.success('Redistribuição adicionada');
    } else if (fromMode === 'single' && toMode !== 'single') {
      // Single source -> multiple destinations
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('Valor deve ser maior que zero');
        return;
      }
      const distribution = distributeToMonthsFn(numAmount, selectedToMonths, toDistMethod);
      let addedCount = 0;
      for (const dest of distribution) {
        if (dest.amount > 0) {
          addChange(fromBU as BuType, fromMonth as MonthType, toBU as BuType, dest.month, dest.amount);
          addedCount++;
        }
      }
      toast.success(`${addedCount} redistribuições adicionadas`);
    } else {
      // Multi-month source: distribute each gap to destination months
      const totalGap = totalSelectedGap;
      if (totalGap <= 0) {
        toast.error('Nenhum gap nos meses selecionados');
        return;
      }
      let addedCount = 0;
      for (const m of selectedFromMonths) {
        const meta = currentGrid[fromBU]?.[m] || 0;
        const dre = dreByBU[fromBU]?.[m] || 0;
        const gap = meta - dre;
        if (gap > 0) {
          if (selectedToMonths.length === 1) {
            addChange(fromBU as BuType, m, toBU as BuType, selectedToMonths[0], Math.round(gap));
            addedCount++;
          } else {
            const distribution = distributeToMonthsFn(Math.round(gap), selectedToMonths, toDistMethod);
            for (const dest of distribution) {
              if (dest.amount > 0) {
                addChange(fromBU as BuType, m, toBU as BuType, dest.month, dest.amount);
                addedCount++;
              }
            }
          }
        }
      }
      toast.success(`${addedCount} redistribuições adicionadas`);
    }
    // Reset "para" fields
    setToBU('');
    setToMonth('');
    setToMonthEnd('');
    setToQuarter('');
    setToMode('single');
    setAmount('');
  };

  // Save
  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!validation.valid) {
      toast.error('Meta total diverge do alvo. Ajuste as redistribuições.');
      return;
    }
    try {
      const sessionId = await saveSession(description);
      toast.success(`Sessão salva com sucesso! ID: ${sessionId?.slice(0, 8)}`);
      setDescription('');
      setActiveTab('history');
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  };

  // Load session changes on expand
  const handleToggleSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (!sessionChanges[sessionId]) {
      try {
        const changes = await getSessionChanges(sessionId);
        setSessionChanges((prev) => ({ ...prev, [sessionId]: changes }));
      } catch {
        toast.error('Erro ao carregar alterações da sessão');
      }
    }
  };

  // Rollback
  const handleConfirmRollback = async () => {
    if (!rollbackId) return;
    try {
      await rollbackSession(rollbackId);
      toast.success('Sessão revertida com sucesso');
      setRollbackId(null);
      setExpandedSession(null);
    } catch (err: any) {
      toast.error(`Erro ao reverter: ${err.message}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Redistribuição de Metas
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>Meta Anual Alvo:</span>
              <Badge variant={validation.valid || pendingChanges.length === 0 ? 'default' : 'destructive'}>
                {formatCurrency(ANNUAL_TARGET)}
              </Badge>
              {pendingChanges.length > 0 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span>Atual após mudanças:</span>
                  <Badge variant={validation.valid ? 'default' : 'destructive'}>
                    {formatCurrency(validation.newTotal)}
                  </Badge>
                  {!validation.valid && (
                    <span className="text-destructive text-xs">
                      (Diff: {formatCurrency(validation.diff)})
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gap">Gaps</TabsTrigger>
              <TabsTrigger value="redistribute">
                Redistribuir
                {pendingChanges.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {pendingChanges.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bu-transfer">
                <Repeat className="h-4 w-4 mr-1" />
                BU Inteira
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Step 1 - Gap Visualization */}
            <TabsContent value="gap" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clique em uma célula com gap positivo para iniciar a redistribuição.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 w-32">BU</TableHead>
                        {MONTHS.map((m) => (
                          <TableHead key={m} className="text-center text-xs px-1 min-w-[80px]">
                            {m}
                          </TableHead>
                        ))}
                        <TableHead className="text-center text-xs font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {BUS.map((bu) => {
                        let buTotal = 0;
                        let buDreTotal = 0;
                        return (
                          <TableRow key={bu}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium text-xs">
                              {BU_LABELS[bu]}
                            </TableCell>
                            {MONTHS.map((month) => {
                              const meta = currentGrid[bu]?.[month] || 0;
                              const dre = dreByBU[bu]?.[month] || 0;
                              const gap = meta - dre;
                              buTotal += meta;
                              buDreTotal += dre;
                              const hasGap = gap > 0 && meta > 0;
                              return (
                                <TableCell
                                  key={month}
                                  className={`text-center text-xs px-1 cursor-pointer hover:bg-muted/50 transition-colors ${
                                    hasGap ? 'bg-red-50 dark:bg-red-950/30' : ''
                                  }`}
                                  onClick={() => hasGap ? handleSelectGap(bu, month as MonthType) : undefined}
                                  title={`Meta: ${formatCurrency(meta)}\nRealizado: ${formatCurrency(dre)}\nGap: ${formatCurrency(gap)}`}
                                >
                                  <div className="font-mono text-[10px]">
                                    {formatCurrency(meta)}
                                  </div>
                                  {(dre > 0 || (meta > 0 && gap > 0)) && (
                                    <div className={`font-mono text-[10px] ${hasGap ? 'text-destructive font-semibold' : 'text-emerald-600'}`}>
                                      Gap: {formatCurrency(gap)}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center text-xs font-bold">
                              <div>{formatCurrency(buTotal)}</div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total row */}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell className="sticky left-0 bg-background z-10 text-xs">TOTAL</TableCell>
                        {MONTHS.map((month) => {
                          let monthTotal = 0;
                          for (const bu of BUS) {
                            monthTotal += currentGrid[bu]?.[month] || 0;
                          }
                          return (
                            <TableCell key={month} className="text-center text-xs px-1">
                              <div className="font-mono text-[10px]">{formatCurrency(monthTotal)}</div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center text-xs">
                          {formatCurrency(currentTotals.overall)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Step 2 - Redistribution Form */}
            <TabsContent value="redistribute" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-1 text-destructive">
                        De (Reduzir)
                      </h4>
                      <Select value={fromBU} onValueChange={(v) => setFromBU(v as BuType)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="BU" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUS.map((bu) => (
                            <SelectItem key={bu} value={bu}>
                              {BU_LABELS[bu]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <RadioGroup
                        value={fromMode}
                        onValueChange={(v) => {
                          setFromMode(v as 'single' | 'quarter' | 'range');
                          setFromMonth('');
                          setFromMonthEnd('');
                          setFromQuarter('');
                          setAmount('');
                        }}
                        className="flex gap-3"
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="single" id="mode-single" />
                          <Label htmlFor="mode-single" className="text-xs cursor-pointer">Mês único</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="quarter" id="mode-quarter" />
                          <Label htmlFor="mode-quarter" className="text-xs cursor-pointer">Trimestre</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="range" id="mode-range" />
                          <Label htmlFor="mode-range" className="text-xs cursor-pointer">Personalizado</Label>
                        </div>
                      </RadioGroup>

                      {fromMode === 'single' && (
                        <Select value={fromMonth} onValueChange={(v) => {
                          setFromMonth(v as MonthType);
                          if (fromBU) {
                            const meta = currentGrid[fromBU]?.[v] || 0;
                            const dre = dreByBU[fromBU]?.[v] || 0;
                            const gap = meta - dre;
                            if (gap > 0) setAmount(String(Math.round(gap)));
                          }
                        }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {fromMode === 'quarter' && (
                        <Select value={fromQuarter} onValueChange={(v) => setFromQuarter(v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Trimestre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                            <SelectItem value="Q2">Q2 (Abr-Jun)</SelectItem>
                            <SelectItem value="Q3">Q3 (Jul-Set)</SelectItem>
                            <SelectItem value="Q4">Q4 (Out-Dez)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {fromMode === 'range' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={fromMonth} onValueChange={(v) => setFromMonth(v as MonthType)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="De Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={fromMonthEnd} onValueChange={(v) => setFromMonthEnd(v as MonthType)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Até Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {fromBU && selectedFromMonths.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            Meses: {selectedFromMonths.join(', ')}
                            {' | '}Campo: {isPontualOnlyBU(fromBU as BuType) ? 'pontual' : 'faturamento'}
                          </p>
                          {fromMode !== 'single' && (
                            <p className="font-semibold text-destructive">
                              Gap total: {formatCurrency(totalSelectedGap)}
                            </p>
                          )}
                          {fromMode === 'single' && fromMonth && (
                            <p>Meta atual: {formatCurrency(currentGrid[fromBU]?.[fromMonth] || 0)}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-1 text-emerald-600">
                        Para (Aumentar)
                      </h4>
                      <Select value={toBU} onValueChange={(v) => setToBU(v as BuType)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="BU" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUS.map((bu) => (
                            <SelectItem key={bu} value={bu}>
                              {BU_LABELS[bu]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <RadioGroup
                        value={toMode}
                        onValueChange={(v) => {
                          setToMode(v as 'single' | 'quarter' | 'range');
                          setToMonth('');
                          setToMonthEnd('');
                          setToQuarter('');
                        }}
                        className="flex gap-3"
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="single" id="to-mode-single" />
                          <Label htmlFor="to-mode-single" className="text-xs cursor-pointer">Mês único</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="quarter" id="to-mode-quarter" />
                          <Label htmlFor="to-mode-quarter" className="text-xs cursor-pointer">Trimestre</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="range" id="to-mode-range" />
                          <Label htmlFor="to-mode-range" className="text-xs cursor-pointer">Personalizado</Label>
                        </div>
                      </RadioGroup>

                      {toMode === 'single' && (
                        <Select value={toMonth} onValueChange={(v) => setToMonth(v as MonthType)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {toMode === 'quarter' && (
                        <Select value={toQuarter} onValueChange={(v) => setToQuarter(v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Trimestre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                            <SelectItem value="Q2">Q2 (Abr-Jun)</SelectItem>
                            <SelectItem value="Q3">Q3 (Jul-Set)</SelectItem>
                            <SelectItem value="Q4">Q4 (Out-Dez)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {toMode === 'range' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={toMonth} onValueChange={(v) => setToMonth(v as MonthType)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="De Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={toMonthEnd} onValueChange={(v) => setToMonthEnd(v as MonthType)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Até Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {toMode !== 'single' && selectedToMonths.length > 1 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Distribuição:</p>
                          <RadioGroup
                            value={toDistMethod}
                            onValueChange={(v) => setToDistMethod(v as 'equal' | 'proportional')}
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="equal" id="dist-equal" />
                              <Label htmlFor="dist-equal" className="text-xs cursor-pointer">Igual</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="proportional" id="dist-proportional" />
                              <Label htmlFor="dist-proportional" className="text-xs cursor-pointer">Proporcional</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {toBU && selectedToMonths.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Meses: {selectedToMonths.join(', ')}
                          {' | '}Campo: {isPontualOnlyBU(toBU as BuType) ? 'pontual' : 'faturamento'}
                        </p>
                      )}

                      {crossFieldWarning && (
                        <Alert variant="destructive" className="py-2">
                          <AlertTriangle className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            Atenção: BUs de origem e destino usam campos diferentes (faturamento vs pontual).
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="md:col-span-2 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button size="sm" onClick={handleAddChange} className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Pending changes list */}
                  {pendingChanges.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Mudanças Pendentes ({pendingChanges.length})</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="text-xs h-7">
                          Limpar Todas
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">De</TableHead>
                            <TableHead className="text-xs">Para</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingChanges.map((change, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">
                                {BU_LABELS[change.fromBU]} / {change.fromMonth}
                              </TableCell>
                              <TableCell className="text-xs">
                                {BU_LABELS[change.toBU]} / {change.toMonth}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                {formatCurrency(change.amount)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeChange(idx)}
                                  className="h-6 w-6 p-0 text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Preview: affected cells */}
                      {pendingChanges.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground">Prévia das Células Afetadas</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">BU</TableHead>
                                <TableHead className="text-xs">Mês</TableHead>
                                <TableHead className="text-xs">Campo</TableHead>
                                <TableHead className="text-xs text-right">Antes</TableHead>
                                <TableHead className="text-xs text-right">Depois</TableHead>
                                <TableHead className="text-xs text-right">Delta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const affected = new Map<string, { bu: BuType; month: MonthType }>();
                                for (const c of pendingChanges) {
                                  affected.set(`${c.fromBU}-${c.fromMonth}`, { bu: c.fromBU, month: c.fromMonth });
                                  affected.set(`${c.toBU}-${c.toMonth}`, { bu: c.toBU, month: c.toMonth });
                                }
                                return Array.from(affected.values()).map(({ bu, month }) => {
                                  const before = currentGrid[bu]?.[month] || 0;
                                  const after = newGrid[bu]?.[month] || 0;
                                  const delta = after - before;
                                  const field = isPontualOnlyBU(bu) ? 'pontual' : 'faturamento';
                                  return (
                                    <TableRow key={`${bu}-${month}`}>
                                      <TableCell className="text-xs">{BU_LABELS[bu]}</TableCell>
                                      <TableCell className="text-xs">{month}</TableCell>
                                      <TableCell className="text-xs">{field}</TableCell>
                                      <TableCell className="text-xs text-right font-mono">{formatCurrency(before)}</TableCell>
                                      <TableCell className="text-xs text-right font-mono">{formatCurrency(after)}</TableCell>
                                      <TableCell className={`text-xs text-right font-mono ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-destructive' : ''}`}>
                                        {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                });
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Running totals */}
                      <div className="grid grid-cols-3 gap-2 text-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Original</p>
                          <p className="text-sm font-bold font-mono">{formatCurrency(currentTotals.overall)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Após Mudanças</p>
                          <p className={`text-sm font-bold font-mono ${validation.valid ? 'text-emerald-600' : 'text-destructive'}`}>
                            {formatCurrency(validation.newTotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Diferença</p>
                          <p className={`text-sm font-bold font-mono ${validation.valid ? 'text-emerald-600' : 'text-destructive'}`}>
                            {formatCurrency(validation.diff)}
                          </p>
                        </div>
                      </div>

                      {!validation.valid && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            A meta total deve ser {formatCurrency(ANNUAL_TARGET)}. Diferença: {formatCurrency(validation.diff)}
                          </AlertDescription>
                        </Alert>
                      )}

                      {validation.valid && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <AlertDescription className="text-emerald-600">
                            Meta total equilibrada em {formatCurrency(ANNUAL_TARGET)}.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Save section */}
                      <div className="flex items-end gap-2 pt-2 border-t">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Descrição da redistribuição *
                          </label>
                          <Input
                            placeholder="Ex: Redistribuir gap de Jan para Mar"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={!validation.valid || !description.trim() || isSaving}
                          className="h-8"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {isSaving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {pendingChanges.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma redistribuição pendente.</p>
                      <p className="text-xs">Vá para a aba Gaps e clique em uma célula para iniciar.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* BU Transfer Tab (Improvement 3) */}
            <TabsContent value="bu-transfer" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-4">
                  <p className="text-sm text-muted-foreground">
                    Redistribua todos os gaps de uma BU inteira para outra. Para cada mês onde meta {'>'} realizado (DRE), o gap será transferido.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-destructive">De BU (Origem)</h4>
                      <Select value={buRedistFromBU} onValueChange={(v) => setBuRedistFromBU(v as BuType)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar BU" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUS.map((bu) => (
                            <SelectItem key={bu} value={bu}>{BU_LABELS[bu]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-emerald-600">Para BU (Destino)</h4>
                      <Select value={buRedistToBU} onValueChange={(v) => setBuRedistToBU(v as BuType)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar BU" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUS.filter((bu) => bu !== buRedistFromBU).map((bu) => (
                            <SelectItem key={bu} value={bu}>{BU_LABELS[bu]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {buRedistFromBU && buRedistPreview.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Prévia da Transferência</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Mês</TableHead>
                            <TableHead className="text-xs text-right">Meta</TableHead>
                            <TableHead className="text-xs text-right">DRE (Realizado)</TableHead>
                            <TableHead className="text-xs text-right">Gap a Transferir</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {buRedistPreview.map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="text-xs">{row.month}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{formatCurrency(row.meta)}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{formatCurrency(row.dre)}</TableCell>
                              <TableCell className="text-xs text-right font-mono text-destructive font-semibold">
                                {formatCurrency(row.gap)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 font-bold">
                            <TableCell className="text-xs">TOTAL</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {formatCurrency(buRedistPreview.reduce((s, r) => s + r.meta, 0))}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {formatCurrency(buRedistPreview.reduce((s, r) => s + r.dre, 0))}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono text-destructive font-semibold">
                              {formatCurrency(buRedistTotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      <Button
                        size="sm"
                        onClick={handleBuRedist}
                        disabled={!buRedistToBU}
                        className="w-full"
                      >
                        <Repeat className="h-4 w-4 mr-1" />
                        Adicionar {buRedistPreview.length} Redistribuições ({formatCurrency(buRedistTotal)})
                      </Button>
                    </div>
                  )}

                  {buRedistFromBU && buRedistPreview.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Nenhum gap encontrado para {BU_LABELS[buRedistFromBU as BuType]}.</p>
                      <p className="text-xs">Todos os meses têm DRE {'≥'} Meta.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {isLoadingSessions && (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                  )}
                  {!isLoadingSessions && sessions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma sessão de redistribuição encontrada.</p>
                    </div>
                  )}
                  {sessions.map((session) => (
                    <div key={session.id} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleToggleSession(session.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedSession === session.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{session.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' | '}{session.user_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={session.is_active ? 'default' : 'secondary'}>
                            {session.is_active ? 'Ativa' : 'Revertida'}
                          </Badge>
                          {session.is_active && isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRollbackId(session.id);
                              }}
                              disabled={isRollingBack}
                              className="h-7 text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reverter
                            </Button>
                          )}
                        </div>
                      </div>
                      {expandedSession === session.id && sessionChanges[session.id] && (
                        <div className="border-t bg-muted/10 p-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">BU</TableHead>
                                <TableHead className="text-xs">Mês</TableHead>
                                <TableHead className="text-xs">Campo</TableHead>
                                <TableHead className="text-xs text-right">Antes</TableHead>
                                <TableHead className="text-xs text-right">Depois</TableHead>
                                <TableHead className="text-xs text-right">Delta</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessionChanges[session.id].map((change) => (
                                <TableRow key={change.id}>
                                  <TableCell className="text-xs">
                                    {BU_LABELS[change.bu as BuType] || change.bu}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {change.month}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {change.field}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_before)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_after)}
                                  </TableCell>
                                  <TableCell className={`text-xs text-right font-mono ${change.delta > 0 ? 'text-emerald-600' : change.delta < 0 ? 'text-destructive' : ''}`}>
                                    {change.delta > 0 ? '+' : ''}{formatCurrency(change.delta)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Clear-all confirmation dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Todas as Mudanças</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todas as {pendingChanges.length} redistribuições pendentes? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearChanges(); setShowClearConfirm(false); }}>
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback confirmation dialog */}
      <AlertDialog open={!!rollbackId} onOpenChange={(open) => !open && setRollbackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter Redistribuição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reverter esta sessão de redistribuição? Todas as metas serão restauradas aos valores anteriores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRollback} disabled={isRollingBack}>
              {isRollingBack ? 'Revertendo...' : 'Confirmar Reversão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
