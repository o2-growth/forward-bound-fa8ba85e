import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChevronsUpDown, Sparkles, X, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePersonnelDreMapping, normalizeLabel } from "@/hooks/usePersonnelDreMapping";
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
  { value: "outro", label: "Outro" },
];

interface PessoaPickerProps {
  pessoas: PessoaRow[];
  value: string | null;
  onChange: (pessoa: PessoaRow | null) => void;
  suggestion?: PessoaRow | null;
  disabled?: boolean;
}

function PessoaPicker({ pessoas, value, onChange, suggestion, disabled }: PessoaPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = pessoas.find((p) => p.ID === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between text-xs h-8", !selected && "text-muted-foreground")}
        >
          <span className="truncate">
            {selected ? selected.Nome || selected["Título"] : suggestion ? `Sugestão: ${suggestion.Nome}` : "Selecionar pessoa..."}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
            <CommandGroup>
              {pessoas.map((p) => (
                <CommandItem
                  key={p.ID}
                  value={`${p.Nome || ""} ${p["Título"] || ""} ${p.Cargo || ""}`}
                  onSelect={() => {
                    onChange(p);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.ID ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="text-sm">{p.Nome || p["Título"]}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.Cargo || "—"} · {p.Time || "—"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  categorias: PersonnelCategoryRow[];
  pendentes: PersonnelCategoryRow[];
  mapeadas: PersonnelCategoryRow[];
  ignoradas: PersonnelCategoryRow[];
  pessoas: PessoaRow[];
  hasGroupsConfigured?: boolean;
}

// Auto-sugestão: encontra pessoa cujo nome (token) aparece na label
function suggestPessoa(label: string, pessoas: PessoaRow[]): PessoaRow | null {
  const norm = normalizeLabel(label);
  let best: { p: PessoaRow; score: number } | null = null;
  for (const p of pessoas) {
    const nome = normalizeLabel(p.Nome || p["Título"] || "");
    if (!nome) continue;
    const tokens = nome.split(/\s+/).filter((t) => t.length >= 3);
    let score = 0;
    for (const t of tokens) {
      if (norm.includes(t)) score += t.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  return best?.p || null;
}

export function DreMappingPanel({ categorias, pendentes, mapeadas, ignoradas, pessoas, hasGroupsConfigured = true }: Props) {
  const { upsert, remove, isSaving } = usePersonnelDreMapping();
  const { toast } = useToast();
  const [tab, setTab] = useState<"pendentes" | "mapeadas" | "ignoradas">(pendentes.length > 0 ? "pendentes" : "mapeadas");
  const [savingLabel, setSavingLabel] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const m = new Map<string, PessoaRow | null>();
    for (const r of pendentes) m.set(r.label, suggestPessoa(r.label, pessoas));
    return m;
  }, [pendentes, pessoas]);

  async function handleSave(row: PersonnelCategoryRow, pessoa: PessoaRow | null, tipo: string, ignored = false) {
    try {
      setSavingLabel(row.label);
      await upsert({
        dre_label_original: row.label,
        group_id: row.groupId,
        group_label: row.groupLabel,
        pessoa_id: ignored ? null : pessoa?.ID || null,
        pessoa_nome: ignored ? null : pessoa?.Nome || pessoa?.["Título"] || null,
        pessoa_time: ignored ? null : pessoa?.Time || null,
        tipo,
        is_ignored: ignored,
      });
      toast({ title: ignored ? "Categoria ignorada" : "Mapeamento salvo", description: row.label });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingLabel(null);
    }
  }

  async function handleAutoApplyAll() {
    let applied = 0;
    for (const row of pendentes) {
      const sug = suggestions.get(row.label);
      if (!sug) continue;
      try {
        await upsert({
          dre_label_original: row.label,
          group_id: row.groupId,
          group_label: row.groupLabel,
          pessoa_id: sug.ID,
          pessoa_nome: sug.Nome || sug["Título"] || null,
          pessoa_time: sug.Time || null,
          tipo: "salario",
          is_ignored: false,
        });
        applied++;
      } catch {}
    }
    toast({ title: `Sugestões aplicadas`, description: `${applied} categorias vinculadas automaticamente.` });
  }

  function renderRow(row: PersonnelCategoryRow) {
    const sug = suggestions.get(row.label);
    const mapping = row.mapping;
    const currentPessoaId = mapping?.pessoa_id || null;
    const currentTipo = mapping?.tipo || "salario";
    const isRowSaving = savingLabel === row.label;
    return (
      <div key={row.label} className="grid grid-cols-[1fr_110px_180px_120px_auto] gap-2 items-center border-b border-border py-2 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.label}</div>
          {row.groupLabel && (
            <div className="text-[10px] text-muted-foreground truncate">{row.groupLabel}</div>
          )}
        </div>
        <div className="tabular-nums text-right text-foreground">{formatCurrency(row.valor)}</div>
        <PessoaPicker
          pessoas={pessoas}
          value={currentPessoaId}
          suggestion={row.status === "pendente" ? sug : null}
          disabled={isRowSaving || row.status === "ignorada"}
          onChange={(p) => handleSave(row, p, currentTipo, false)}
        />
        <Select
          value={currentTipo}
          disabled={isRowSaving || row.status === "ignorada"}
          onValueChange={(v) => {
            const cur = pessoas.find((p) => p.ID === currentPessoaId) || null;
            handleSave(row, cur, v, false);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPO_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {isRowSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {row.status !== "ignorada" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={isRowSaving}
              onClick={() => handleSave(row, null, currentTipo, true)}
              title="Marcar como não-pessoal / ignorar"
            >
              Ignorar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={isRowSaving}
              onClick={async () => {
                await remove(row.label);
                toast({ title: "Mapeamento removido" });
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {mapping && row.status === "mapeada" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={isRowSaving}
              onClick={async () => {
                await remove(row.label);
                toast({ title: "Mapeamento removido" });
              }}
              title="Remover mapeamento"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Mapeamento Categoria DRE → Pessoa</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Vincule cada lançamento de pessoal a uma pessoa. Os vínculos são reaproveitados em todos os meses.
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
            {pendentes.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleAutoApplyAll} disabled={isSaving}>
                <Sparkles className="h-3 w-3 mr-1" />
                Aplicar sugestões
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
                Tudo mapeado! 🎉
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_110px_180px_120px_auto] gap-2 text-[11px] text-muted-foreground border-b border-border pb-1 mb-1">
                  <span>Categoria DRE</span>
                  <span className="text-right">Valor no período</span>
                  <span>Pessoa</span>
                  <span>Tipo</span>
                  <span></span>
                </div>
                {pendentes.map(renderRow)}
              </>
            )}
          </TabsContent>

          <TabsContent value="mapeadas" className="mt-3">
            {mapeadas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum mapeamento ainda.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_110px_180px_120px_auto] gap-2 text-[11px] text-muted-foreground border-b border-border pb-1 mb-1">
                  <span>Categoria DRE</span>
                  <span className="text-right">Valor no período</span>
                  <span>Pessoa</span>
                  <span>Tipo</span>
                  <span></span>
                </div>
                {mapeadas.map(renderRow)}
              </>
            )}
          </TabsContent>

          <TabsContent value="ignoradas" className="mt-3">
            {ignoradas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma categoria ignorada.</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_110px_180px_120px_auto] gap-2 text-[11px] text-muted-foreground border-b border-border pb-1 mb-1">
                  <span>Categoria DRE</span>
                  <span className="text-right">Valor no período</span>
                  <span>Pessoa</span>
                  <span>Tipo</span>
                  <span></span>
                </div>
                {ignoradas.map(renderRow)}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
