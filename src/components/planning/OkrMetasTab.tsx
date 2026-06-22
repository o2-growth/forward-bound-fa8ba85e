import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useOkrMetas, useUpsertOkrMeta, useDeleteOkrMeta, type OkrMeta } from '@/hooks/useOkrMetas';

type Draft = Omit<OkrMeta, 'id' | 'created_at' | 'updated_at'> & { id?: string };

const EMPTY_DRAFT: Draft = {
  kr_key: '',
  label: '',
  target_value: 0,
  unit: 'pontos',
  direction: 'gte',
  period: 'Q1/2026',
  year: 2026,
  quarter: 1,
  display_order: 99,
  is_active: true,
};

export function OkrMetasTab() {
  const { data: metas = [], isLoading } = useOkrMetas();
  const upsert = useUpsertOkrMeta();
  const del = useDeleteOkrMeta();
  const { toast } = useToast();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);

  const getDraft = (m: OkrMeta): Draft => drafts[m.id] ?? { ...m };
  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] ?? metas.find(m => m.id === id)!), ...patch } }));

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    try {
      await upsert.mutateAsync({ ...d, target_value: Number(d.target_value) });
      toast({ title: 'OKR atualizado' });
      setDrafts(prev => { const c = { ...prev }; delete c[id]; return c; });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const handleCreate = async () => {
    if (!newDraft.kr_key || !newDraft.label) {
      toast({ variant: 'destructive', title: 'Preencha kr_key e label' });
      return;
    }
    try {
      await upsert.mutateAsync({ ...newDraft, target_value: Number(newDraft.target_value) });
      toast({ title: 'OKR criado' });
      setNewDraft(EMPTY_DRAFT);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Excluir "${label}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast({ title: 'OKR removido' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">Metas / OKRs (CS)</h2>
        <p className="text-muted-foreground">
          Metas usadas em "Proximidade das Metas (KRs)" nos indicadores de Churn e NPS.
          Edite valores aqui; o realizado continua sendo calculado automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">KRs cadastrados</CardTitle>
          <CardDescription>
            <code>kr_key</code> conhecidos: <code>lt_medio</code>, <code>logo_churn</code>,
            {' '}<code>revenue_churn</code>, <code>nps_score</code>, <code>csat_score</code>.
            Outros KRs aparecem na tela com valor "—" até serem ligados ao realizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>kr_key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metas.map(m => {
                const d = getDraft(m);
                const dirty = !!drafts[m.id];
                return (
                  <TableRow key={m.id}>
                    <TableCell><Input value={d.kr_key} onChange={e => updateDraft(m.id, { kr_key: e.target.value })} className="w-36" /></TableCell>
                    <TableCell><Input value={d.label} onChange={e => updateDraft(m.id, { label: e.target.value })} className="min-w-[260px]" /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={d.target_value} onChange={e => updateDraft(m.id, { target_value: Number(e.target.value) })} className="w-24" /></TableCell>
                    <TableCell>
                      <Select value={d.unit} onValueChange={v => updateDraft(m.id, { unit: v })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pontos">pontos</SelectItem>
                          <SelectItem value="%">%</SelectItem>
                          <SelectItem value="meses">meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={d.direction} onValueChange={v => updateDraft(m.id, { direction: v as 'gte' | 'lte' })}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={d.period} onChange={e => updateDraft(m.id, { period: e.target.value })} className="w-28" /></TableCell>
                    <TableCell><Input type="number" value={d.display_order} onChange={e => updateDraft(m.id, { display_order: Number(e.target.value) })} className="w-20" /></TableCell>
                    <TableCell><Switch checked={d.is_active} onCheckedChange={v => updateDraft(m.id, { is_active: v })} /></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={!dirty || upsert.isPending} onClick={() => save(m.id)} title="Salvar"><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id, m.label)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar novo KR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label>kr_key</Label><Input value={newDraft.kr_key} onChange={e => setNewDraft(d => ({ ...d, kr_key: e.target.value }))} placeholder="ex: nrr" /></div>
            <div className="md:col-span-2"><Label>Label</Label><Input value={newDraft.label} onChange={e => setNewDraft(d => ({ ...d, label: e.target.value }))} placeholder="Manter NRR acima de 100%" /></div>
            <div><Label>Meta</Label><Input type="number" step="0.01" value={newDraft.target_value} onChange={e => setNewDraft(d => ({ ...d, target_value: Number(e.target.value) }))} /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={newDraft.unit} onValueChange={v => setNewDraft(d => ({ ...d, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pontos">pontos</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="meses">meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direção</Label>
              <Select value={newDraft.direction} onValueChange={v => setNewDraft(d => ({ ...d, direction: v as 'gte' | 'lte' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gte">≥ (maior ou igual)</SelectItem>
                  <SelectItem value="lte">≤ (menor ou igual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Período</Label><Input value={newDraft.period} onChange={e => setNewDraft(d => ({ ...d, period: e.target.value }))} /></div>
            <div><Label>Ordem</Label><Input type="number" value={newDraft.display_order} onChange={e => setNewDraft(d => ({ ...d, display_order: Number(e.target.value) }))} /></div>
          </div>
          <div className="mt-4">
            <Button onClick={handleCreate} disabled={upsert.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar KR
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
