import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHrData } from '@/hooks/useHrData';
import { useSquadCostFromDre, type SquadAssignmentRow, type SupplierAliasRow } from '@/hooks/useSquadCostFromDre';
import { UnmatchedSuppliersPanel } from './UnmatchedSuppliersPanel';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const ROLE_OPTIONS = [
  { value: 'cfo', label: 'CFO' },
  { value: 'analyst', label: 'Analista' },
] as const;

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

function normalizeLabel(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ltda|me\b|eireli|consultoria|assessoria|financeira|servicos?/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CfoSquadAdminTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const dateRange = useMemo(() => {
    const ref = subMonths(new Date(), 1);
    return { from: startOfMonth(ref), to: endOfMonth(ref) };
  }, []);

  const hr = useHrData({ startDate: dateRange.from, endDate: dateRange.to });
  const squad = useSquadCostFromDre({ startDate: dateRange.from, endDate: dateRange.to });

  const assignmentsQ = useQuery({
    queryKey: ['cfo-squad-assignments-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cfo_squad_assignment')
        .select('id, cfo_squad_nome, pessoa_nome, role, pessoa_id')
        .order('cfo_squad_nome');
      if (error) throw error;
      return (data || []) as SquadAssignmentRow[];
    },
  });

  const aliasesQ = useQuery({
    queryKey: ['dre-supplier-aliases-admin'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('dre_supplier_alias')
        .select('id, label_normalizado, label_original, pessoa_id, pessoa_nome')
        .order('label_original');
      if (error) throw error;
      return (data || []) as SupplierAliasRow[];
    },
  });

  // Todas as pessoas ativas elegíveis (sem filtro de já-vinculadas) para o dropdown de alias
  const allPessoasFinanc = useMemo(() => {
    return (hr.rawPessoas || [])
      .filter((p) => {
        const cargo = (p.Cargo || '').toLowerCase();
        const sit = (p['Situação'] || '').toLowerCase();
        if (sit !== 'ativo') return false;
        return (
          cargo.includes('cfo') ||
          cargo.includes('fp&a') ||
          cargo.includes('financeiro') ||
          cargo.includes('estagi') ||
          cargo.includes('coordenador')
        );
      })
      .map((p) => ({
        nome: p.Nome || p['Título'] || '',
        cargo: p.Cargo || '',
        id: p.ID,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hr.rawPessoas]);


  const assignments = assignmentsQ.data || [];
  const squads = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.cfo_squad_nome))).sort(),
    [assignments]
  );

  const candidates = useMemo(() => {
    const assigned = new Set(assignments.map((a) => a.pessoa_nome.toLowerCase().trim()));
    return (hr.rawPessoas || [])
      .filter((p) => {
        const cargo = (p.Cargo || '').toLowerCase();
        const sit = (p['Situação'] || '').toLowerCase();
        if (sit !== 'ativo') return false;
        const ok =
          cargo.includes('cfo') ||
          cargo.includes('fp&a') ||
          cargo.includes('fp\u0026a') ||
          cargo.includes('financeiro') ||
          cargo.includes('estagi');
        if (!ok) return false;
        return !assigned.has((p.Nome || p['Título'] || '').toLowerCase().trim());
      })
      .map((p) => ({
        nome: p.Nome || p['Título'] || '',
        cargo: p.Cargo || '',
        id: p.ID,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [hr.rawPessoas, assignments]);

  const [newSquad, setNewSquad] = useState('');
  const [newSquadInput, setNewSquadInput] = useState('');
  const [newPessoa, setNewPessoa] = useState('');
  const [newRole, setNewRole] = useState<'cfo' | 'analyst'>('analyst');
  const [aliasPicks, setAliasPicks] = useState<Record<string, string>>({}); // labelOriginal → pessoa.nome
  const [autoSuggested, setAutoSuggested] = useState<Set<string>>(new Set()); // labels com sugestão auto
  const [bulkSaving, setBulkSaving] = useState(false);

  const STOP = new Set(['de','da','do','dos','das','e','jr','junior','neto','filho','sa','ltda','me','eireli']);
  const tokensOf = (s: string) =>
    new Set(normalizeLabel(s).split(' ').filter((t) => t.length >= 3 && !STOP.has(t)));

  const handleAutoSuggest = () => {
    const picks: Record<string, string> = { ...aliasPicks };
    const flagged = new Set(autoSuggested);
    let count = 0;
    for (const u of squad.unmatched) {
      if (picks[u.label]) continue;
      const labelTokens = tokensOf(u.label);
      if (labelTokens.size === 0) continue;
      let best: { nome: string; score: number } | null = null;
      let bestCount = 0;
      for (const c of allPessoasFinanc) {
        const score = [...tokensOf(c.nome)].filter((t) => labelTokens.has(t)).length;
        if (!best || score > best.score) {
          best = { nome: c.nome, score };
          bestCount = 1;
        } else if (score === best.score && score > 0) {
          bestCount++;
        }
      }
      if (best && best.score >= 2 && bestCount === 1) {
        picks[u.label] = best.nome;
        flagged.add(u.label);
        count++;
      }
    }
    setAliasPicks(picks);
    setAutoSuggested(flagged);
    toast({
      title: 'Sugestões geradas',
      description: `${count} fornecedor(es) com vínculo sugerido automaticamente. Revise e clique em "Salvar todas".`,
    });
  };

  const handleBulkSaveSuggestions = async () => {
    const rows = Array.from(autoSuggested)
      .filter((label) => aliasPicks[label])
      .map((label) => {
        const pessoaNome = aliasPicks[label];
        const cand = allPessoasFinanc.find((c) => c.nome === pessoaNome);
        return {
          label_normalizado: normalizeLabel(label),
          label_original: label,
          pessoa_nome: pessoaNome,
          pessoa_id: cand?.id || null,
        };
      });
    if (rows.length === 0) {
      toast({ title: 'Nenhuma sugestão para salvar', variant: 'destructive' });
      return;
    }
    setBulkSaving(true);
    const { error } = await (supabase as any)
      .from('dre_supplier_alias')
      .upsert(rows, { onConflict: 'label_normalizado' });
    setBulkSaving(false);
    if (error) {
      toast({ title: 'Erro no salvamento em lote', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Sugestões salvas', description: `${rows.length} vínculo(s) criados.` });
    setAliasPicks({});
    setAutoSuggested(new Set());
    refresh();
  };


  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['cfo-squad-assignments'] });
    qc.invalidateQueries({ queryKey: ['cfo-squad-assignments-admin'] });
    qc.invalidateQueries({ queryKey: ['dre-supplier-aliases'] });
    qc.invalidateQueries({ queryKey: ['dre-supplier-aliases-admin'] });
  };

  const handleSaveAlias = async (labelOriginal: string) => {
    const pessoaNome = aliasPicks[labelOriginal];
    if (!pessoaNome) {
      toast({ title: 'Selecione uma pessoa', variant: 'destructive' });
      return;
    }
    const cand = allPessoasFinanc.find((c) => c.nome === pessoaNome);
    const { error } = await (supabase as any).from('dre_supplier_alias').insert({
      label_normalizado: normalizeLabel(labelOriginal),
      label_original: labelOriginal,
      pessoa_nome: pessoaNome,
      pessoa_id: cand?.id || null,
    });
    if (error) {
      toast({ title: 'Erro ao salvar alias', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Alias salvo', description: `${labelOriginal} → ${pessoaNome}` });
    setAliasPicks((prev) => {
      const next = { ...prev };
      delete next[labelOriginal];
      return next;
    });
    refresh();
  };

  const handleRemoveAlias = async (id: string) => {
    const { error } = await (supabase as any).from('dre_supplier_alias').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover alias', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Alias removido' });
    refresh();
  };


  const handleAdd = async () => {
    const squadFinal = newSquad === '__new' ? newSquadInput.trim() : newSquad;
    if (!squadFinal || !newPessoa) {
      toast({ title: 'Preencha squad e pessoa', variant: 'destructive' });
      return;
    }
    const cand = candidates.find((c) => c.nome === newPessoa);
    const { error } = await supabase.from('cfo_squad_assignment').insert({
      cfo_squad_nome: squadFinal,
      pessoa_nome: newPessoa,
      role: newRole,
      pessoa_id: cand?.id || null,
    });
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Vínculo criado' });
    setNewPessoa('');
    setNewSquadInput('');
    refresh();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('cfo_squad_assignment').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Vínculo removido' });
    refresh();
  };

  const handleUpdateSquad = async (id: string, squadNovo: string) => {
    const { error } = await supabase
      .from('cfo_squad_assignment')
      .update({ cfo_squad_nome: squadNovo })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    refresh();
  };

  const handleUpdateRole = async (id: string, role: 'cfo' | 'analyst') => {
    const { error } = await supabase.from('cfo_squad_assignment').update({ role }).eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    refresh();
  };

  if (assignmentsQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Squads CFOaaS</h2>
        <p className="text-sm text-muted-foreground">
          Vincule cada CFO e analista a um squad. O custo real (via CNPJ) é puxado do DRE Oxy e
          agregado por squad na aba Operação → CFOs.
        </p>
      </div>

      {/* Resumo de validação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Validação do mês de referência</CardTitle>
          <CardDescription>
            Custo CaaS de pessoal explicado pelos squads vs. valores não vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {squad.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded border border-border p-3">
                <div className="text-xs text-muted-foreground">Total CaaS (DRE)</div>
                <div className="text-lg font-semibold tabular-nums">{formatBRL(squad.totalCaasDre)}</div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="text-xs text-muted-foreground">Em squads</div>
                <div className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {formatBRL(squad.totalSquads)}
                </div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="text-xs text-muted-foreground">Pessoa s/ squad</div>
                <div className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatBRL(squad.totalSemSquad)}
                </div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="text-xs text-muted-foreground">Fornecedor s/ vínculo</div>
                <div className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {formatBRL(squad.totalUnmatched)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form de novo vínculo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo vínculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Squad</label>
              <Select value={newSquad} onValueChange={setNewSquad}>
                <SelectTrigger>
                  <SelectValue placeholder="Squad existente" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new">+ Novo squad</SelectItem>
                </SelectContent>
              </Select>
              {newSquad === '__new' && (
                <Input
                  className="mt-2"
                  placeholder="Nome do novo squad"
                  value={newSquadInput}
                  onChange={(e) => setNewSquadInput(e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pessoa</label>
              <Select value={newPessoa} onValueChange={setNewPessoa}>
                <SelectTrigger>
                  <SelectValue placeholder="Pessoa (Pipefy)" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <div className="text-xs text-muted-foreground px-2 py-1">Todas as pessoas elegíveis já estão vinculadas</div>
                  ) : (
                    candidates.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome} <span className="text-muted-foreground ml-1">· {c.cargo}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Função</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'cfo' | 'analyst')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full">
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista por squad */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vínculos atuais</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Squad</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead className="text-right">Custo mês ref.</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const sq = squad.porSquad.find((s) => s.cfoNome === a.cfo_squad_nome);
                const membro = sq?.membros.find(
                  (m) => m.pessoaNome.toLowerCase().trim() === a.pessoa_nome.toLowerCase().trim()
                );
                const pessoa = (hr.rawPessoas || []).find(
                  (p) => (p.Nome || p['Título'] || '').toLowerCase().trim() === a.pessoa_nome.toLowerCase().trim()
                );
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Select
                        value={a.cfo_squad_nome}
                        onValueChange={(v) => handleUpdateSquad(a.id, v)}
                      >
                        <SelectTrigger className="h-8 w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {squads.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-medium">{a.pessoa_nome}</TableCell>
                    <TableCell>
                      <Select
                        value={a.role}
                        onValueChange={(v) => handleUpdateRole(a.id, v as 'cfo' | 'analyst')}
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {pessoa?.CNPJ || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {membro ? formatBRL(membro.total) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(a.id)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Não vinculados no DRE */}
      {squad.unmatched.length > 0 && (
        <UnmatchedSuppliersPanel unmatched={squad.unmatched} onSaved={refresh} />
      )}

      {/* Aliases manuais configurados */}
      {(aliasesQ.data?.length || 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aliases manuais (fornecedor → pessoa)</CardTitle>
            <CardDescription>
              Vínculos persistidos. Remover só se foi cadastrado errado — o fornecedor volta pra
              lista "sem vínculo" no próximo render.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor (DRE)</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aliasesQ.data || []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{a.label_original}</TableCell>
                    <TableCell className="text-sm font-medium">{a.pessoa_nome}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAlias(a.id)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pessoas sem CPF e sem CNPJ na base do Pipefy */}
      {(() => {
        const semId = (hr.rawPessoas || []).filter((p) => {
          const sit = (p['Situação'] || '').toLowerCase();
          if (sit !== 'ativo') return false;
          const cargo = (p.Cargo || '').toLowerCase();
          const ok =
            cargo.includes('cfo') ||
            cargo.includes('fp&a') ||
            cargo.includes('financeiro') ||
            cargo.includes('estagi');
          if (!ok) return false;
          const cnpjOk = p.CNPJ && p.CNPJ.replace(/\D/g, '').length >= 8;
          const cpfOk = p.CPF && p.CPF.replace(/\D/g, '').length >= 11;
          return !cnpjOk && !cpfOk;
        });
        if (semId.length === 0) return null;
        return (
          <Card className="border-amber-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Pessoas ativas (financeiro) sem CPF e sem CNPJ
              </CardTitle>
              <CardDescription>
                Essas pessoas não podem ser vinculadas a lançamentos do DRE até terem CPF ou CNPJ
                cadastrado no card da Database de Pessoas do Pipefy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>ID Pipefy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semId.map((p) => (
                    <TableRow key={p.ID || p.Nome}>
                      <TableCell className="text-sm">{p.Nome || p['Título']}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.Cargo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{p.ID || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })()}

      {/* Pessoas sem squad */}
      {squad.peopleWithoutSquad.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Pessoas vinculadas no DRE mas sem squad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squad.peopleWithoutSquad.map((m) => (
                  <TableRow key={m.pessoaNome}>
                    <TableCell className="text-sm">{m.pessoaNome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.cnpj || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(m.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">
              Use o form acima para vincular essas pessoas a um squad.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
