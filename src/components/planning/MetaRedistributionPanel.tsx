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
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMetaRedistribution,
  ANNUAL_TARGET,
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

  const validation = validateTotal();
  const newGrid = useMemo(() => calculateNewTotals(), [calculateNewTotals]);

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

  // Add pending change
  const handleAddChange = () => {
    if (!fromBU || !fromMonth || !toBU || !toMonth) {
      toast.error('Preencha todos os campos');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    addChange(fromBU as BuType, fromMonth as MonthType, toBU as BuType, toMonth as MonthType, numAmount);
    // Reset "para" fields
    setToBU('');
    setToMonth('');
    setAmount('');
    toast.success('Redistribuição adicionada');
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gap">Gaps</TabsTrigger>
              <TabsTrigger value="redistribute">
                Redistribuir
                {pendingChanges.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {pendingChanges.length}
                  </Badge>
                )}
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
                              const hasGap = gap > 0 && dre > 0;
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
                                  {dre > 0 && (
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
                      <div className="grid grid-cols-2 gap-2">
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
                        <Select value={fromMonth} onValueChange={(v) => setFromMonth(v as MonthType)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {fromBU && fromMonth && (
                        <p className="text-xs text-muted-foreground">
                          Meta atual: {formatCurrency(currentGrid[fromBU]?.[fromMonth] || 0)}
                          {' | '}Campo: {isPontualOnlyBU(fromBU as BuType) ? 'pontual' : 'faturamento'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-1 text-emerald-600">
                        Para (Aumentar)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
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
                        <Select value={toMonth} onValueChange={(v) => setToMonth(v as MonthType)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Mês" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {toBU && toMonth && (
                        <p className="text-xs text-muted-foreground">
                          Meta atual: {formatCurrency(currentGrid[toBU]?.[toMonth] || 0)}
                          {' | '}Campo: {isPontualOnlyBU(toBU as BuType) ? 'pontual' : 'faturamento'}
                        </p>
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
                        <Button variant="ghost" size="sm" onClick={clearChanges} className="text-xs h-7">
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
                                <TableHead className="text-xs">De</TableHead>
                                <TableHead className="text-xs">Para</TableHead>
                                <TableHead className="text-xs text-right">Valor</TableHead>
                                <TableHead className="text-xs text-right">Antes (De)</TableHead>
                                <TableHead className="text-xs text-right">Depois (De)</TableHead>
                                <TableHead className="text-xs text-right">Antes (Para)</TableHead>
                                <TableHead className="text-xs text-right">Depois (Para)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessionChanges[session.id].map((change) => (
                                <TableRow key={change.id}>
                                  <TableCell className="text-xs">
                                    {BU_LABELS[change.from_bu as BuType] || change.from_bu} / {change.from_month}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {BU_LABELS[change.to_bu as BuType] || change.to_bu} / {change.to_month}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.amount)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_before_from)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_after_from)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_before_to)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {formatCurrency(change.value_after_to)}
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
