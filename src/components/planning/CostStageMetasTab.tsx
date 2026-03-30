import { useState, useEffect } from 'react';
import { useCostStageMetas, COST_STAGE_KEYS, COST_STAGE_LABELS, type CostStageKey } from '@/hooks/useCostStageMetas';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
const MONTH_LABELS: Record<string, string> = {
  jan: 'Jan', fev: 'Fev', mar: 'Mar', abr: 'Abr', mai: 'Mai', jun: 'Jun',
  jul: 'Jul', ago: 'Ago', set: 'Set', out: 'Out', nov: 'Nov', dez: 'Dez',
};

const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

export function CostStageMetasTab() {
  const { metas, isLoading, upsertMetas } = useCostStageMetas();
  const { toast } = useToast();
  const { logAction } = useAuditLogs();

  // local[metric][month] = value
  const [local, setLocal] = useState<Record<CostStageKey, Record<string, number>>>(() => {
    const init: any = {};
    COST_STAGE_KEYS.forEach(k => { init[k] = {}; MONTHS.forEach(m => { init[k][m] = 0; }); });
    return init;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Sync from DB
  useEffect(() => {
    if (metas.length > 0) {
      const updated: Record<CostStageKey, Record<string, number>> = {} as any;
      COST_STAGE_KEYS.forEach(key => {
        updated[key] = {};
        MONTHS.forEach(month => {
          const found = metas.find(m => m.month === month);
          updated[key][month] = found ? Number(found[key]) : 0;
        });
      });
      setLocal(updated);
      setHasChanges(false);
    }
  }, [metas]);

  const startEditing = (key: CostStageKey, month: string) => {
    setEditingCell(`${key}-${month}`);
    setEditingValue(local[key][month]?.toString() || '0');
  };

  const commitEdit = (key: CostStageKey, month: string) => {
    const val = Math.max(0, Math.round(Number(editingValue) || 0));
    setLocal(prev => ({
      ...prev,
      [key]: { ...prev[key], [month]: val },
    }));
    setEditingCell(null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const rows = MONTHS.map(month => {
      const row: any = { month, year: 2026 };
      COST_STAGE_KEYS.forEach(key => { row[key] = local[key][month] || 0; });
      return row;
    });

    try {
      await upsertMetas.mutateAsync(rows);
      await logAction('update_cost_stage_metas', 'Atualizou metas de custo por etapa');
      toast({ title: 'Metas de custo salvas!' });
      setHasChanges(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar metas de custo' });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-gradient">Metas de Custo por Etapa</h2>
          <p className="text-muted-foreground text-sm">CPL, CPMQL, CPRM, CPRR, CPP, CPV por mês</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || upsertMetas.isPending} size="sm">
          {upsertMetas.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[100px]">Métrica</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m} className="text-center min-w-[100px]">{MONTH_LABELS[m]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COST_STAGE_KEYS.map(key => (
                  <TableRow key={key}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">{COST_STAGE_LABELS[key]}</TableCell>
                    {MONTHS.map(month => {
                      const cellId = `${key}-${month}`;
                      const isEditing = editingCell === cellId;
                      const value = local[key][month] || 0;

                      return (
                        <TableCell key={month} className="text-center p-1">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => commitEdit(key, month)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(key, month); if (e.key === 'Escape') setEditingCell(null); }}
                              className="h-8 text-center text-xs w-24"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => startEditing(key, month)}
                              className="w-full h-8 text-xs hover:bg-muted/50 rounded px-2 transition-colors"
                            >
                              {value > 0 ? formatCurrency(value) : '—'}
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
