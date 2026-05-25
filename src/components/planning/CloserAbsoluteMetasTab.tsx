import { useState, useEffect, useRef } from 'react';
import { useCloserAbsoluteMetas } from '@/hooks/useCloserAbsoluteMetas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuditLogs } from '@/hooks/useAuditLogs';

type Field = 'rm' | 'rr' | 'prop' | 'venda' | 'faturamento';
const FIELDS: { key: Field; label: string; monetary?: boolean }[] = [
  { key: 'rm', label: 'RM' },
  { key: 'rr', label: 'RR' },
  { key: 'prop', label: 'Prop' },
  { key: 'venda', label: 'Venda' },
  { key: 'faturamento', label: 'Faturamento (R$)', monetary: true },
];

type LocalKey = string; // `${closer}-${month}-${field}`

export function CloserAbsoluteMetasTab() {
  const { toast } = useToast();
  const { logAction } = useAuditLogs();
  const { metas, isLoading, bulkUpdateMetas, CLOSERS, MONTHS } = useCloserAbsoluteMetas();

  const [local, setLocal] = useState<Record<LocalKey, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const dbSnapshot = useRef<Record<LocalKey, number>>({});

  useEffect(() => {
    const map: Record<LocalKey, number> = {};
    metas.forEach(m => {
      map[`${m.closer}-${m.month}-rm`] = m.rm_meta;
      map[`${m.closer}-${m.month}-rr`] = m.rr_meta;
      map[`${m.closer}-${m.month}-prop`] = m.prop_meta;
      map[`${m.closer}-${m.month}-venda`] = m.venda_meta;
      map[`${m.closer}-${m.month}-faturamento`] = m.faturamento_meta || 0;
    });
    setLocal(map);
    dbSnapshot.current = { ...map };
    setHasChanges(false);
  }, [metas]);

  const getVal = (closer: string, month: string, field: Field) =>
    local[`${closer}-${month}-${field}`] ?? 0;

  const setVal = (closer: string, month: string, field: Field, v: number) => {
    // Faturamento aceita decimais; demais campos são inteiros (qtd).
    const sanitized = field === 'faturamento' ? Math.max(0, v || 0) : Math.max(0, Math.floor(v || 0));
    setLocal(prev => ({ ...prev, [`${closer}-${month}-${field}`]: sanitized }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = CLOSERS.flatMap(closer =>
      MONTHS.map(month => ({
        closer,
        month,
        rm_meta: getVal(closer, month, 'rm'),
        rr_meta: getVal(closer, month, 'rr'),
        prop_meta: getVal(closer, month, 'prop'),
        venda_meta: getVal(closer, month, 'venda'),
        faturamento_meta: getVal(closer, month, 'faturamento'),
      }))
    );

    try {
      await bulkUpdateMetas.mutateAsync(updates);
      for (const u of updates) {
        (['rm', 'rr', 'prop', 'venda', 'faturamento'] as Field[]).forEach(async (f) => {
          const old = dbSnapshot.current[`${u.closer}-${u.month}-${f}`] ?? 0;
          const dbKey = `${f}_meta` as 'rm_meta' | 'rr_meta' | 'prop_meta' | 'venda_meta' | 'faturamento_meta';
          const next = u[dbKey];
          if (old !== next) {
            await logAction(`closer_meta_abs_${f}`, `${u.month}: ${u.closer} ${f.toUpperCase()} ${old} → ${next}`, { ...u, field: f, old, new: next });
          }
        });
      }
      const snap = { ...dbSnapshot.current };
      updates.forEach(u => {
        snap[`${u.closer}-${u.month}-rm`] = u.rm_meta;
        snap[`${u.closer}-${u.month}-rr`] = u.rr_meta;
        snap[`${u.closer}-${u.month}-prop`] = u.prop_meta;
        snap[`${u.closer}-${u.month}-venda`] = u.venda_meta;
        snap[`${u.closer}-${u.month}-faturamento`] = u.faturamento_meta;
      });
      dbSnapshot.current = snap;
      toast({ title: 'Metas Closer salvas com sucesso!' });
      setHasChanges(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar as metas.' });
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
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">Metas Closer (Indicadores)</h2>
        <p className="text-muted-foreground">
          Metas mensais absolutas por Closer para RM, RR, Proposta e Venda. Usadas no rank de Closers do dashboard comercial.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || bulkUpdateMetas.isPending}>
              {bulkUpdateMetas.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Closer / Métrica</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m} className="text-center min-w-[80px]">{m}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLOSERS.flatMap((closer, ci) =>
                  FIELDS.map((f, fi) => (
                    <TableRow key={`${closer}-${f.key}`} className={fi % 2 === 1 ? 'bg-muted/30' : ''}>
                      <TableCell className={`sticky left-0 z-10 font-medium ${fi % 2 === 1 ? 'bg-muted/30' : 'bg-background'}`}>
                        {closer} <span className="text-xs text-muted-foreground">· {f.label}</span>
                      </TableCell>
                      {MONTHS.map(month => (
                        <TableCell key={`${closer}-${f.key}-${month}`} className="text-center p-1">
                          <Input
                            type="number"
                            min={0}
                            step={f.monetary ? 1000 : 1}
                            value={getVal(closer, month, f.key)}
                            onChange={(e) => setVal(closer, month, f.key, parseFloat(e.target.value) || 0)}
                            className={`${f.monetary ? 'w-28' : 'w-20'} h-8 text-center text-sm mx-auto`}
                            placeholder={f.monetary ? 'R$' : ''}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
          <CardDescription>
            Estas metas alimentam o "Rank de Closers" da aba Indicadores Comercial.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Quando o filtro de data não cobre o mês inteiro, a meta é rateada proporcionalmente pelos dias úteis (seg–sex) do intervalo selecionado.</p>
          <p>O % rateio em "Metas por Closer" continua sendo usado para distribuir a meta financeira da BU — esta aba é independente e serve apenas ao rank por pessoa.</p>
        </CardContent>
      </Card>
    </div>
  );
}
