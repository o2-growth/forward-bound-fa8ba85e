import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X, Pencil, Loader2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePersonnelDreMapping, type TeamSplit, splitSum } from "@/hooks/usePersonnelDreMapping";
import type { PersonnelCategoryRow } from "@/hooks/usePersonnelCostFromDRE";
import type { PessoaRow } from "@/hooks/useHrData";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

const TIPO_OPTIONS = [
  { value: "salario", label: "Salário" },
  { value: "beneficio", label: "Benefício" },
  { value: "encargo", label: "Encargo" },
  { value: "rescisao", label: "Rescisão" },
  { value: "pro_labore", label: "Pró-labore" },
  { value: "bonus_plr", label: "Bônus / PLR" },
  { value: "outro", label: "Outro" },
];

interface Props {
  categorias: PersonnelCategoryRow[];
  pendentes: PersonnelCategoryRow[];
  mapeadas: PersonnelCategoryRow[];
  ignoradas: PersonnelCategoryRow[];
  pessoas: PessoaRow[];
  hasGroupsConfigured?: boolean;
}

function activeTimesFromPessoas(pessoas: PessoaRow[]): { time: string; headcount: number }[] {
  const map = new Map<string, number>();
  for (const p of pessoas) {
    const sit = (p["Situação"] || "").trim().toLowerCase();
    if (sit && sit !== "ativo") continue;
    const t = (p.Time || "").trim();
    if (!t) continue;
    map.set(t, (map.get(t) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([time, headcount]) => ({ time, headcount }))
    .sort((a, b) => b.headcount - a.headcount);
}

function suggestByHeadcount(times: { time: string; headcount: number }[]): TeamSplit {
  const total = times.reduce((s, t) => s + t.headcount, 0);
  if (total === 0) return {};
  const split: TeamSplit = {};
  let acc = 0;
  times.forEach((t, i) => {
    if (i === times.length - 1) {
      split[t.time] = Math.max(0, 100 - acc);
    } else {
      const pct = Math.round((t.headcount / total) * 100);
      split[t.time] = pct;
      acc += pct;
    }
  });
  return split;
}

interface SplitEditorProps {
  open: boolean;
  onClose: () => void;
  row: PersonnelCategoryRow | null;
  times: { time: string; headcount: number }[];
  mapeadas: PersonnelCategoryRow[];
  onSave: (split: TeamSplit, tipo: string) => Promise<void>;
  isSaving: boolean;
}

function SplitEditor({ open, onClose, row, times, mapeadas, onSave, isSaving }: SplitEditorProps) {
  const [split, setSplit] = useState<TeamSplit>({});
  const [tipo, setTipo] = useState<string>("salario");
  const [copySource, setCopySource] = useState<string>("");

  useEffect(() => {
    if (!row) return;
    const existing = row.mapping?.team_split || {};
    if (Object.keys(existing).length > 0) {
      setSplit({ ...existing });
    } else {
      // Pre-fill all known times with 0
      const init: TeamSplit = {};
      for (const t of times) init[t.time] = 0;
      setSplit(init);
    }
    setTipo(row.mapping?.tipo || "salario");
    setCopySource("");
  }, [row, times]);

  const sum = splitSum(split);
  const isValid = Math.abs(sum - 100) < 0.5 && Object.values(split).some((v) => v > 0);

  function setPct(time: string, value: number) {
    setSplit((prev) => ({ ...prev, [time]: Math.max(0, Math.min(100, value)) }));
  }

  function applySuggestion() {
    setSplit(suggestByHeadcount(times));
  }

  function applyCopy(sourceLabel: string) {
    const src = mapeadas.find((m) => m.label === sourceLabel);
    if (!src?.mapping?.team_split) return;
    setSplit({ ...src.mapping.team_split });
    setCopySource(sourceLabel);
  }

  function equalize() {
    const n = times.length;
    if (n === 0) return;
    const each = Math.floor(100 / n);
    const rest = 100 - each * n;
    const next: TeamSplit = {};
    times.forEach((t, i) => {
      next[t.time] = each + (i === 0 ? rest : 0);
    });
    setSplit(next);
  }

  async function handleSubmit() {
    // Filter zeros
    const clean: TeamSplit = {};
    for (const [t, v] of Object.entries(split)) if (v > 0) clean[t] = v;
    await onSave(clean, tipo);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Distribuir entre Times</DialogTitle>
          <DialogDescription>
            <span className="block font-medium text-foreground">{row?.label}</span>
            <span className="text-sm">Valor no período: <strong>{formatCurrency(row?.valor || 0)}</strong></span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Atalhos */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={applySuggestion} type="button">
              <Sparkles className="h-3 w-3 mr-1" />
              Sugerir por headcount
            </Button>
            <Button size="sm" variant="outline" onClick={equalize} type="button">
              Dividir igualmente
            </Button>
            {mapeadas.length > 0 && (
              <Select value={copySource} onValueChange={applyCopy}>
                <SelectTrigger className="h-8 text-xs w-[220px]">
                  <SelectValue placeholder="📋 Copiar de outra categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {mapeadas
                    .filter((m) => m.label !== row?.label && splitSum(m.mapping?.team_split) > 0)
                    .map((m) => (
                      <SelectItem key={m.label} value={m.label}>
                        {m.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tipo */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-20">Natureza:</span>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-8 text-xs w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Times */}
          <div className="rounded border border-border">
            <div className="grid grid-cols-[1fr_70px_100px_120px] gap-2 px-3 py-2 text-[11px] text-muted-foreground bg-muted/40 border-b border-border">
              <span>Time</span>
              <span className="text-right">Headcount</span>
              <span className="text-right">% alocado</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
              {times.map((t) => {
                const pct = Number(split[t.time] || 0);
                const valor = (row?.valor || 0) * (pct / 100);
                return (
                  <div key={t.time} className="grid grid-cols-[1fr_70px_100px_120px] gap-2 px-3 py-1.5 items-center text-sm">
                    <span className="truncate text-foreground">{t.time}</span>
                    <span className="text-right text-xs text-muted-foreground tabular-nums">{t.headcount}</span>
                    <div className="flex items-center justify-end">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={pct}
                        onChange={(e) => setPct(t.time, Number(e.target.value))}
                        className="h-7 w-16 text-xs text-right tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground ml-1">%</span>
                    </div>
                    <span className="text-right tabular-nums text-foreground">{formatCurrency(valor)}</span>
                  </div>
                );
              })}
              {times.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum Time ativo encontrado no DB Pessoas.
                </div>
              )}
            </div>
            <div className={cn(
              "px-3 py-2 text-xs flex justify-between items-center border-t border-border",
              Math.abs(sum - 100) < 0.5 ? "bg-chart-2/10 text-chart-2" : "bg-amber-500/10 text-amber-600"
            )}>
              <span>Soma: <strong className="tabular-nums">{sum.toFixed(0)}%</strong> {Math.abs(sum - 100) < 0.5 ? "✓" : "(precisa ser 100%)"}</span>
              <span className="tabular-nums">{formatCurrency((row?.valor || 0) * (sum / 100))}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Salvar distribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DreMappingPanel({ categorias, pendentes, mapeadas, ignoradas, pessoas, hasGroupsConfigured = true }: Props) {
  const { upsert, remove, isSaving } = usePersonnelDreMapping();
  const { toast } = useToast();
  const [tab, setTab] = useState<"pendentes" | "mapeadas" | "ignoradas">(pendentes.length > 0 ? "pendentes" : "mapeadas");
  const [editing, setEditing] = useState<PersonnelCategoryRow | null>(null);

  const times = useMemo(() => activeTimesFromPessoas(pessoas), [pessoas]);

  async function handleSaveSplit(row: PersonnelCategoryRow, split: TeamSplit, tipo: string) {
    try {
      await upsert({
        dre_label_original: row.label,
        group_id: row.groupId,
        group_label: row.groupLabel,
        team_split: split,
        tipo,
        is_ignored: false,
      });
      toast({ title: "Distribuição salva", description: row.label });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  }

  async function handleIgnore(row: PersonnelCategoryRow) {
    try {
      await upsert({
        dre_label_original: row.label,
        group_id: row.groupId,
        group_label: row.groupLabel,
        team_split: {},
        tipo: row.mapping?.tipo || "outro",
        is_ignored: true,
      });
      toast({ title: "Categoria ignorada", description: row.label });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  async function handleRemove(row: PersonnelCategoryRow) {
    try {
      await remove(row.label);
      toast({ title: "Mapeamento removido" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  }

  async function handleSuggestAll() {
    if (times.length === 0) {
      toast({ title: "Sem Times ativos", description: "Cadastre Time em DB Pessoas para sugerir.", variant: "destructive" });
      return;
    }
    const suggestion = suggestByHeadcount(times);
    let applied = 0;
    for (const row of pendentes) {
      try {
        await upsert({
          dre_label_original: row.label,
          group_id: row.groupId,
          group_label: row.groupLabel,
          team_split: suggestion,
          tipo: "salario",
          is_ignored: false,
        });
        applied++;
      } catch {}
    }
    toast({ title: "Sugestões aplicadas", description: `${applied} categorias distribuídas por headcount.` });
  }

  function renderRow(row: PersonnelCategoryRow) {
    const split = row.mapping?.team_split || {};
    const splitEntries = Object.entries(split).filter(([, v]) => Number(v) > 0);
    const sum = splitSum(split);
    const tipoLabel = TIPO_OPTIONS.find((t) => t.value === (row.mapping?.tipo || ""))?.label || "—";

    return (
      <div key={row.label} className="grid grid-cols-[1fr_120px_1fr_100px_auto] gap-3 items-center border-b border-border py-2 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.label}</div>
          {row.groupLabel && (
            <div className="text-[10px] text-muted-foreground truncate">{row.groupLabel}</div>
          )}
        </div>
        <div className="tabular-nums text-right text-foreground">{formatCurrency(row.valor)}</div>
        <div className="min-w-0">
          {row.status === "ignorada" ? (
            <span className="text-xs text-muted-foreground italic">Ignorada</span>
          ) : splitEntries.length === 0 ? (
            <span className="text-xs text-muted-foreground">Não distribuída</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {splitEntries.slice(0, 4).map(([t, p]) => (
                <Badge key={t} variant="outline" className="text-[10px] py-0 px-1.5">
                  {t}: {Number(p).toFixed(0)}%
                </Badge>
              ))}
              {splitEntries.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{splitEntries.length - 4}</span>
              )}
              {Math.abs(sum - 100) > 0.5 && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/50 text-amber-600">
                  ⚠ {sum.toFixed(0)}%
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{tipoLabel}</div>
        <div className="flex items-center gap-1">
          {row.status !== "ignorada" && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(row)} disabled={isSaving}>
              <Pencil className="h-3 w-3 mr-1" />
              {splitEntries.length === 0 ? "Distribuir" : "Editar"}
            </Button>
          )}
          {row.status === "pendente" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => handleIgnore(row)} disabled={isSaving}>
              Ignorar
            </Button>
          )}
          {(row.status === "mapeada" || row.status === "ignorada") && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleRemove(row)} disabled={isSaving} title="Remover">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const colHeader = (
    <div className="grid grid-cols-[1fr_120px_1fr_100px_auto] gap-3 text-[11px] text-muted-foreground border-b border-border pb-1 mb-1">
      <span>Categoria DRE</span>
      <span className="text-right">Valor no período</span>
      <span>Distribuição por Time</span>
      <span>Natureza</span>
      <span></span>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Mapeamento Categoria DRE → Times</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Distribua cada categoria de pessoal entre os Times (% que soma 100). Os splits são reaproveitados em todos os meses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                {pendentes.length} pendentes
              </Badge>
              <Badge variant="outline" className="border-chart-2/50 text-chart-2">
                {mapeadas.length} mapeadas
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {ignoradas.length} ignoradas
              </Badge>
              {pendentes.length > 0 && times.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleSuggestAll} disabled={isSaving}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Distribuir pendentes por headcount
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
              <TabsTrigger value="mapeadas">Mapeadas ({mapeadas.length})</TabsTrigger>
              <TabsTrigger value="ignoradas">Ignoradas ({ignoradas.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="mt-3">
              {pendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {!hasGroupsConfigured
                    ? "Configure os grupos DRE de Pessoal acima para listar categorias."
                    : categorias.length === 0
                    ? "Sem lançamentos de pessoal no período selecionado."
                    : "Tudo mapeado! 🎉"}
                </p>
              ) : (
                <>
                  {colHeader}
                  {pendentes.map(renderRow)}
                </>
              )}
            </TabsContent>

            <TabsContent value="mapeadas" className="mt-3">
              {mapeadas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma categoria distribuída ainda.</p>
              ) : (
                <>
                  {colHeader}
                  {mapeadas.map(renderRow)}
                </>
              )}
            </TabsContent>

            <TabsContent value="ignoradas" className="mt-3">
              {ignoradas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma categoria ignorada.</p>
              ) : (
                <>
                  {colHeader}
                  {ignoradas.map(renderRow)}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SplitEditor
        open={!!editing}
        onClose={() => setEditing(null)}
        row={editing}
        times={times}
        mapeadas={mapeadas}
        onSave={(split, tipo) => editing ? handleSaveSplit(editing, split, tipo) : Promise.resolve()}
        isSaving={isSaving}
      />
    </>
  );
}
