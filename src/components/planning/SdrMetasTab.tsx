import { useState, useEffect, useMemo, useRef } from 'react';
import { useSdrMetas, SdrBuType, getSdrsForBU } from '@/hooks/useSdrMetas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuditLogs } from '@/hooks/useAuditLogs';

const BU_LABELS: Record<SdrBuType, string> = {
  modelo_atual: 'Modelo Atual',
  o2_tax: 'O2 TAX',
  oxy_hacker: 'Oxy Hacker',
  franquia: 'Franquia',
};

type LocalKey = string; // `${bu}-${month}-${sdr}-${field}`

export function SdrMetasTab() {
  const { toast } = useToast();
  const { logAction } = useAuditLogs();
  const {
    metas,
    isLoading,
    getMeta,
    bulkUpdateMetas,
    resetBuToDefault,
    BUS,
    MONTHS,
  } = useSdrMetas();

  const [selectedBu, setSelectedBu] = useState<SdrBuType>('modelo_atual');
  const [localMetas, setLocalMetas] = useState<Record<LocalKey, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const dbSnapshot = useRef<Record<LocalKey, number>>({});

  useEffect(() => {
    if (metas) {
      const map: Record<LocalKey, number> = {};
      metas.forEach(m => {
        map[`${m.bu}-${m.month}-${m.sdr}-rm`] = m.rm_meta;
        map[`${m.bu}-${m.month}-${m.sdr}-rr`] = m.rr_meta;
      });
      setLocalMetas(map);
      dbSnapshot.current = { ...map };
      setHasChanges(false);
    }
  }, [metas]);

  const validSdrs = useMemo(() => getSdrsForBU(selectedBu), [selectedBu]);

  const getLocal = (bu: string, month: string, sdr: string, field: 'rm' | 'rr'): number => {
    const key = `${bu}-${month}-${sdr}-${field}`;
    if (key in localMetas) return localMetas[key];
    const m = getMeta(bu, month, sdr);
    return field === 'rm' ? m.rm : m.rr;
  };

  const updateLocal = (bu: string, month: string, sdr: string, field: 'rm' | 'rr', value: number) => {
    const key = `${bu}-${month}-${sdr}-${field}`;
    const v = Math.max(0, Math.floor(value || 0));
    setLocalMetas(prev => ({ ...prev, [key]: v }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = MONTHS.flatMap(month =>
      validSdrs.map(sdr => ({
        bu: selectedBu,
        month,
        sdr,
        rm_meta: getLocal(selectedBu, month, sdr, 'rm'),
        rr_meta: getLocal(selectedBu, month, sdr, 'rr'),
      }))
    );

    try {
      await bulkUpdateMetas.mutateAsync(updates);
      const buLabel = BU_LABELS[selectedBu];

      for (const u of updates) {
        const oldRm = dbSnapshot.current[`${u.bu}-${u.month}-${u.sdr}-rm`] ?? 0;
        const oldRr = dbSnapshot.current[`${u.bu}-${u.month}-${u.sdr}-rr`] ?? 0;
        if (oldRm !== u.rm_meta) {
          await logAction('sdr_meta_rm', `${buLabel} ${u.month}: ${u.sdr} RM ${oldRm} → ${u.rm_meta}`, { ...u, field: 'rm', old: oldRm, new: u.rm_meta });
        }
        if (oldRr !== u.rr_meta) {
          await logAction('sdr_meta_rr', `${buLabel} ${u.month}: ${u.sdr} RR ${oldRr} → ${u.rr_meta}`, { ...u, field: 'rr', old: oldRr, new: u.rr_meta });
        }
      }

      const newSnap: Record<LocalKey, number> = { ...dbSnapshot.current };
      updates.forEach(u => {
        newSnap[`${u.bu}-${u.month}-${u.sdr}-rm`] = u.rm_meta;
        newSnap[`${u.bu}-${u.month}-${u.sdr}-rr`] = u.rr_meta;
      });
      dbSnapshot.current = newSnap;

      toast({ title: 'Metas SDR salvas com sucesso!' });
      setHasChanges(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar as metas' });
    }
  };

  const handleReset = async () => {
    try {
      await resetBuToDefault.mutateAsync(selectedBu);
      toast({ title: 'Metas zeradas para esta BU!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao resetar', description: 'Não foi possível resetar as metas' });
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
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">Metas por SDR</h2>
        <p className="text-muted-foreground">
          Configure metas mensais de Reunião Agendada (RM) e Reunião Realizada (RR) por SDR e BU.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Unidade de Negócio</label>
              <Select value={selectedBu} onValueChange={(v) => setSelectedBu(v as SdrBuType)}>
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

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={resetBuToDefault.isPending}>
                {resetBuToDefault.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Zerar BU
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!hasChanges || bulkUpdateMetas.isPending}>
                {bulkUpdateMetas.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">SDR / Métrica</TableHead>
                  {MONTHS.map(month => (
                    <TableHead key={month} className="text-center min-w-[80px]">{month}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {validSdrs.flatMap(sdr => ([
                  <TableRow key={`${sdr}-rm`}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {sdr} <span className="text-xs text-muted-foreground">· RM</span>
                    </TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={`${sdr}-rm-${month}`} className="text-center p-1">
                        <Input
                          type="number"
                          min={0}
                          value={getLocal(selectedBu, month, sdr, 'rm')}
                          onChange={(e) => updateLocal(selectedBu, month, sdr, 'rm', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center text-sm mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>,
                  <TableRow key={`${sdr}-rr`} className="bg-muted/30">
                    <TableCell className="sticky left-0 bg-muted/30 z-10 font-medium">
                      {sdr} <span className="text-xs text-muted-foreground">· RR</span>
                    </TableCell>
                    {MONTHS.map(month => (
                      <TableCell key={`${sdr}-rr-${month}`} className="text-center p-1">
                        <Input
                          type="number"
                          min={0}
                          value={getLocal(selectedBu, month, sdr, 'rr')}
                          onChange={(e) => updateLocal(selectedBu, month, sdr, 'rr', parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-center text-sm mx-auto"
                        />
                      </TableCell>
                    ))}
                  </TableRow>,
                ]))}
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
            As metas de RM e RR aqui definidas alimentam o Dashboard Comercial quando o filtro de SDR é usado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Ao filtrar por um ou mais SDRs no dashboard, as metas de RM e RR exibidas passam a ser a soma das metas dos SDRs selecionados (dentro das BUs ativas).</p>
          <p>Sem filtro de SDR, soma todas as metas dos SDRs daquela BU. Se ainda não houver metas cadastradas para o recorte, o dashboard mantém o valor atual de funil como fallback.</p>
        </CardContent>
      </Card>
    </div>
  );
}
