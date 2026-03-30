import { useState, useEffect, useMemo, useRef } from 'react';
import { useCloserMetas, BuType, MonthType, CloserType, BU_CLOSERS, getClosersForBU } from '@/hooks/useCloserMetas';
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

export function CloserMetasTab() {
  const { toast } = useToast();
  const { logAction } = useAuditLogs();
  const {
    metas, 
    isLoading, 
    getPercentage, 
    bulkUpdateMetas, 
    resetBuToDefault,
    BUS,
    MONTHS,
    CLOSERS 
  } = useCloserMetas();

  const [selectedBu, setSelectedBu] = useState<BuType>('modelo_atual');
  const [localMetas, setLocalMetas] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const dbMetasSnapshot = useRef<Record<string, number>>({});

  // Initialize local metas from fetched data
  useEffect(() => {
    if (metas.length > 0) {
      const metasMap: Record<string, number> = {};
      metas.forEach(m => {
        const key = `${m.bu}-${m.month}-${m.closer}`;
        metasMap[key] = m.percentage;
      });
      setLocalMetas(metasMap);
      dbMetasSnapshot.current = { ...metasMap };
      setHasChanges(false);
    }
  }, [metas]);

  // Get closers valid for the selected BU
  const validClosers = useMemo(() => {
    return getClosersForBU(selectedBu);
  }, [selectedBu]);

  // Get local percentage value
  const getLocalPercentage = (bu: string, month: string, closer: string): number => {
    const key = `${bu}-${month}-${closer}`;
    return localMetas[key] ?? (validClosers.length === 1 ? 100 : 50);
  };

  // Update local percentage
  const updateLocalPercentage = (bu: string, month: string, closer: string, value: number) => {
    const key = `${bu}-${month}-${closer}`;
    const clampedValue = Math.max(0, Math.min(100, value));
    
    // If only one closer for this BU, set to 100%
    if (validClosers.length === 1) {
      setLocalMetas(prev => ({
        ...prev,
        [key]: 100,
      }));
      return;
    }
    
    // Auto-adjust the other closer to maintain 100% total
    const otherCloser = validClosers.find(c => c !== closer);
    if (otherCloser) {
      const otherKey = `${bu}-${month}-${otherCloser}`;
      const otherValue = 100 - clampedValue;
      
      setLocalMetas(prev => ({
        ...prev,
        [key]: clampedValue,
        [otherKey]: otherValue,
      }));
    } else {
      setLocalMetas(prev => ({
        ...prev,
        [key]: clampedValue,
      }));
    }
    
    setHasChanges(true);
  };

  // Calculate total for a month
  const getMonthTotal = (bu: string, month: string): number => {
    return validClosers.reduce((sum, closer) => sum + getLocalPercentage(bu, month, closer), 0);
  };

  // Check if all months have valid totals (100%)
  const allMonthsValid = useMemo(() => {
    return MONTHS.every(month => getMonthTotal(selectedBu, month) === 100);
  }, [localMetas, selectedBu, validClosers]);

  // Save changes
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
      
      // Log changes
      const buLabel = BU_LABELS[selectedBu] || selectedBu;
      for (const month of MONTHS) {
        for (const closer of validClosers) {
          const key = `${selectedBu}-${month}-${closer}`;
          const oldVal = dbMetasSnapshot.current[key] ?? 50;
          const newVal = getLocalPercentage(selectedBu, month, closer);
          if (oldVal !== newVal) {
            const closerName = closer.split(' ')[0];
            await logAction('closer_meta', `${buLabel} ${month}: ${closerName} de ${oldVal}% para ${newVal}%`, { bu: selectedBu, month, closer, old_value: oldVal, new_value: newVal });
          }
        }
      }
      
      // Update snapshot
      const newSnapshot: Record<string, number> = {};
      updates.forEach(u => { newSnapshot[`${u.bu}-${u.month}-${u.closer}`] = u.percentage; });
      dbMetasSnapshot.current = { ...dbMetasSnapshot.current, ...newSnapshot };
      
      toast({ title: 'Metas salvas com sucesso!' });
      setHasChanges(false);
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao salvar', 
        description: 'Não foi possível atualizar as metas' 
      });
    }
  };

  // Reset to 50/50
  const handleReset = async () => {
    try {
      await resetBuToDefault.mutateAsync(selectedBu);
      toast({ title: 'Metas resetadas para 50/50!' });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao resetar', 
        description: 'Não foi possível resetar as metas' 
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
          Configure a porcentagem de responsabilidade de cada closer para as metas de vendas
        </p>
      </div>

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
                      <SelectItem key={bu} value={bu}>
                        {BU_LABELS[bu]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
                disabled={resetBuToDefault.isPending}
              >
                {resetBuToDefault.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Resetar 50/50
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
                            type="number"
                            min={0}
                            max={100}
                            value={getLocalPercentage(selectedBu, month, closer)}
                            onChange={(e) => updateLocalPercentage(
                              selectedBu, 
                              month, 
                              closer, 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-16 h-8 text-center text-sm"
                            disabled={validClosers.length === 1}
                          />
                          <span className="text-muted-foreground ml-1 text-xs">%</span>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="sticky left-0 bg-muted/50 z-10 font-medium">
                    Total
                  </TableCell>
                  {MONTHS.map(month => {
                    const total = getMonthTotal(selectedBu, month);
                    const isValid = total === 100;
                    return (
                      <TableCell key={`total-${month}`} className="text-center">
                        <Badge variant={isValid ? "secondary" : "destructive"}>
                          {total}%
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
            <strong>Exemplo:</strong> Se a meta de MQL para Janeiro é 100 e você definir Pedro com 60%:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Filtrar só por Pedro → Meta = 60</li>
            <li>Filtrar só por Daniel → Meta = 40</li>
            <li>Filtrar por ambos (ou sem filtro) → Meta = 100</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
