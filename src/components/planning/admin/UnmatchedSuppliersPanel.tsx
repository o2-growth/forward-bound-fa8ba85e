import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHrData } from '@/hooks/useHrData';
import type { UnmatchedSupplier } from '@/hooks/useSquadCostFromDre';

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

const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'jr', 'junior', 'neto', 'filho', 'sa', 'ltda', 'me', 'eireli']);
const tokensOf = (s: string) =>
  new Set(normalizeLabel(s).split(' ').filter((t) => t.length >= 3 && !STOP.has(t)));

interface Props {
  unmatched: UnmatchedSupplier[];
  /** Quando o usuário salva algo, fazemos invalidate global. Esse callback é
   *  opcional caso o parent queira reagir (fechar modal, etc.). */
  onSaved?: () => void;
  /** Mostrar como Card stand-alone (admin) ou inline sem card (dialog do CfoView). */
  variant?: 'card' | 'inline';
}

export function UnmatchedSuppliersPanel({ unmatched, onSaved, variant = 'card' }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const dateRange = useMemo(() => {
    const ref = subMonths(new Date(), 1);
    return { from: startOfMonth(ref), to: endOfMonth(ref) };
  }, []);

  const hr = useHrData({ startDate: dateRange.from, endDate: dateRange.to });

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

  const [aliasPicks, setAliasPicks] = useState<Record<string, string>>({});
  const [autoSuggested, setAutoSuggested] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dre-supplier-aliases'] });
    qc.invalidateQueries({ queryKey: ['dre-supplier-aliases-admin'] });
    qc.invalidateQueries({ queryKey: ['squad-cost-drill'] });
    onSaved?.();
  };

  const handleAutoSuggest = () => {
    const picks: Record<string, string> = { ...aliasPicks };
    const flagged = new Set(autoSuggested);
    let count = 0;
    for (const u of unmatched) {
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

  if (unmatched.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-4 text-center">
        Nenhum fornecedor sem vínculo no período.
      </div>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
      <div>
        <div className="text-base flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
          <AlertTriangle className="h-4 w-4" /> Fornecedores DRE sem vínculo
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Lançamentos da Oxy que não casaram por CPF, CNPJ nem nome. Use "Auto-sugerir" para
          pré-preencher por similaridade de nome; revise e salve em lote.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleAutoSuggest}>
          Auto-sugerir vínculos
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={autoSuggested.size === 0 || bulkSaving}
          onClick={handleBulkSaveSuggestions}
        >
          {bulkSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Salvar todas ({autoSuggested.size})
        </Button>
      </div>
    </div>
  );

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fornecedor (label do DRE)</TableHead>
          <TableHead>Identificador</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-[280px]">Vincular a pessoa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...unmatched]
          .sort((a, b) => b.valor - a.valor)
          .map((u, i) => (
            <TableRow key={`${u.label}-${i}`}>
              <TableCell className="text-sm">
                <div className="flex flex-col gap-0.5">
                  <span>{u.label}</span>
                  {autoSuggested.has(u.label) && (
                    <Badge variant="outline" className="w-fit border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">
                      Sugestão automática
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs tabular-nums">
                {u.idDetectado ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        u.tipoIdDetectado === 'cpf'
                          ? 'border-blue-500/40 text-blue-600 dark:text-blue-400'
                          : 'border-purple-500/40 text-purple-600 dark:text-purple-400'
                      }
                    >
                      {u.tipoIdDetectado?.toUpperCase()}
                    </Badge>
                    <span className="font-mono">{u.idDetectado}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">sem ID na label</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{u.category}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(u.valor)}</TableCell>
              <TableCell>
                <div className="flex gap-1.5">
                  <Select
                    value={aliasPicks[u.label] || ''}
                    onValueChange={(v) => setAliasPicks((p) => ({ ...p, [u.label]: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar pessoa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allPessoasFinanc.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>
                          {c.nome}{' '}
                          <span className="text-muted-foreground ml-1">· {c.cargo}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!aliasPicks[u.label]}
                    onClick={() => handleSaveAlias(u.label)}
                    className="h-8"
                  >
                    Salvar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        {header}
        {table}
      </div>
    );
  }

  return (
    <Card className="border-red-500/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> Fornecedores DRE sem vínculo
            </CardTitle>
            <CardDescription>
              Lançamentos da Oxy que não casaram por CPF, CNPJ nem nome. Use "Auto-sugerir" para
              pré-preencher por similaridade de nome; revise e salve em lote.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAutoSuggest}>
              Auto-sugerir vínculos
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={autoSuggested.size === 0 || bulkSaving}
              onClick={handleBulkSaveSuggestions}
            >
              {bulkSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Salvar todas ({autoSuggested.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{table}</CardContent>
    </Card>
  );
}
