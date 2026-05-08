import { useState, useEffect, useMemo, useRef } from 'react';
import { useCloserMetas, BuType, BU_CLOSERS, getClosersForBU } from '@/hooks/useCloserMetas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuditLogs } from '@/hooks/useAuditLogs';

const BU_LABELS: Record<BuType, string> = {
  modelo_atual: 'Modelo Atual',
  o2_tax: 'O2 TAX',
  oxy_hacker: 'Oxy Hacker',
  franquia: 'Franquia',
};

const formatPct = (n: number): string => {
  if (!isFinite(n)) return '0';
  // até 2 casas, sem zeros à direita; vírgula como decimal
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export function CloserMetasTab() {
  const { toast } = useToast();
  const { logAction } = useAuditLogs();
  const {
    metas,
    isLoading,
    bulkUpdateMetas,
    resetBuToZero,
    BUS,
    MONTHS,
  } = useCloserMetas();

  const [selectedBu, setSelectedBu] = useState<BuType>('modelo_atual');
  const [localMetas, setLocalMetas] = useState<Record<string, number>>({});
  // Texto bruto do input enquanto o usuário digita (permite "12,", "12.5", etc.)
  const [inputText, setInputText] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const dbMetasSnapshot = useRef<Record<string, number>>({});

  useEffect(() => {
    if (metas.length > 0) {
      const metasMap: Record<string, number> = {};
      metas.forEach(m => {
        const key = `${m.bu}-${m.month}-${m.closer}`;
        metasMap[key] = Number(m.percentage) || 0;
      });
      setLocalMetas(metasMap);
      dbMetasSnapshot.current = { ...metasMap };
      setInputText({});
      setHasChanges(false);
    }
  }, [metas]);

  const validClosers = useMemo(() => getClosersForBU(selectedBu), [selectedBu]);

  const getLocalPercentage = (bu: string, month: string, closer: string): number => {
    const key = `${bu}-${month}-${closer}`;
    if (localMetas[key] !== undefined) return localMetas[key];
    const closersForBU = BU_CLOSERS[bu as BuType] || [];
    return closersForBU.length === 1 ? 100 : 0;
  };

  const updateLocalPercentage = (bu: string, month: string, closer: string, rawText: string) => {
    const key = `${bu}-${month}-${closer}`;
    setInputText(prev => ({ ...prev, [key]: rawText }));

    // BU com 1 só closer trava em 100
    if (validClosers.length === 1) {
      setLocalMetas(prev => ({ ...prev, [key]: 100 }));
      return;
    }

    const normalized = rawText.replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    if (rawText === '' || isNaN(parsed)) {
      setLocalMetas(prev => ({ ...prev, [key]: 0 }));
    } else {
      const clamped = Math.max(0, Math.min(100, parsed));
      setLocalMetas(prev => ({ ...prev, [key]: clamped }));
    }
    setHasChanges(true);
  };

  const getInputValue = (bu: string, month: string, closer: string): string => {
    const key = `${bu}-${month}-${closer}`;
    if (inputText[key] !== undefined) return inputText[key];
    return formatPct(getLocalPercentage(bu, month, closer));
  };

  const getMonthTotal = (bu: string, month: string): number => {
    return validClosers.reduce((sum, closer) => sum + getLocalPercentage(bu, month, closer), 0);
  };

  const allMonthsValid = useMemo(() => {
    return MONTHS.every(month => Math.abs(getMonthTotal(selectedBu, month) - 100) < 0.01);
  }, [localMetas, selectedBu, validClosers]);

  const handleSave = async () => {
    const updates = MONTHS.flatMap(month =>
      validClosers.map(closer => ({
        bu: selectedBu,
        month,
        closer,
        percentage: getLocalPercentage(selectedBu, month, closer),
      }))
    );

    try {
      await bulkUpdateMetas.mutateAsync(updates);

      const buLabel = BU_LABELS[selectedBu] || selectedBu;
      for (const month of MONTHS) {
        for (const closer of validClosers) {
          const key = `${selectedBu}-${month}-${closer}`;
          const oldVal = dbMetasSnapshot.current[key] ?? 0;
          const newVal = getLocalPercentage(selectedBu, month, closer);
          if (Math.abs(oldVal - newVal) > 0.001) {
            const closerName = closer.split(' ')[0];
            await logAction(
              'closer_meta',
              `${buLabel} ${month}: ${closerName} de ${formatPct(oldVal)}% para ${formatPct(newVal)}%`,
              { bu: selectedBu, month, closer, old_value: oldVal, new_value: newVal },
            );
          }
        }
      }

      const newSnapshot: Record<string, number> = {};
      updates.forEach(u => { newSnapshot[`${u.bu}-${u.month}-${u.closer}`] = u.percentage; });
      dbMetasSnapshot.current = { ...dbMetasSnapshot.current, ...newSnapshot };

      toast({ title: 'Metas salvas com sucesso!' });
      setInputText({});
      setHasChanges(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as metas',
      });
    }
  };

  const handleReset = async () => {
    try {
      await resetBuToZero.mutateAsync(selectedBu);
      toast({ title: 'Metas zeradas para esta BU!' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao zerar',
        description: 'Não foi possível zerar as metas',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">
          Metas por Closer
        </h2>
        <p className="text-muted-foreground">
          Configure a porcentagem de responsabilidade de cada closer. A soma de cada mês deve fechar 100% (decimais permitidos, ex: 12,5%).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Unidade de Negócio</label>
              <Select value={selectedBu} onValueChange={(v) => setSelectedBu(v as BuType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUS.map(bu => (
                    <SelectItem key={bu} value={bu}>
                      {BU_LABELS[bu]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={resetBuToZero.isPending}
              >
                {resetBuToZero.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Zerar BU
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || !allMonthsValid || bulkUpdateMetas.isPending}
              >
                {bulkUpdateMetas.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Closer</TableHead>
                  {MONTHS.map(month => (
                    <TableHead key={month} className="text-center min-w-[80px]">
                      {month}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {validClosers.map(closer => (
                  <TableRow key={closer}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {closer.split(' ')[0]}
                    </TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={`${closer}-${month}`} className="text-center p-1">
                        <div className="flex items-center justify-center">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={getInputValue(selectedBu, month, closer)}
                            onChange={(e) => updateLocalPercentage(
                              selectedBu,
                              month,
                              closer,
                              e.target.value,
                            )}
                            className="w-20 h-8 text-center text-sm"
                            disabled={validClosers.length === 1}
                          />
                          <span className="text-muted-foreground ml-1 text-xs">%</span>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="sticky left-0 bg-muted/50 z-10 font-medium">
                    Total
                  </TableCell>
                  {MONTHS.map(month => {
                    const total = getMonthTotal(selectedBu, month);
                    const isValid = Math.abs(total - 100) < 0.01;
                    return (
                      <TableCell key={`total-${month}`} className="text-center">
                        <Badge variant={isValid ? "secondary" : "destructive"}>
                          {formatPct(total)}%
                        </Badge>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {!allMonthsValid && (
            <p className="text-sm text-destructive mt-4">
              ⚠️ Todos os meses devem somar exatamente 100% para salvar.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
          <CardDescription>
            As porcentagens definidas aqui serão aplicadas às metas na aba Indicadores quando você filtrar por closer.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Exemplo:</strong> Se a meta de MQL para Janeiro é 100 e Modelo Atual estiver dividida como Pedro 30%, Daniel 20%, Thiago 17,5%, Amanda 17,5% e Bruna 15%:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Filtrar só Pedro → Meta = 30</li>
            <li>Filtrar Pedro + Daniel → Meta = 50</li>
            <li>Sem filtro → Meta = 100 (soma de todos)</li>
          </ul>
          <p className="pt-2">Decimais são permitidos (ex: 12,5%). A soma de cada mês precisa fechar 100% para liberar o botão Salvar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
