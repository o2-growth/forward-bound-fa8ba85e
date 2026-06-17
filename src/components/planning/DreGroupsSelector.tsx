import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings2, Sparkles, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DreGroupOption } from "@/hooks/usePersonnelCostFromDRE";

interface Props {
  allGroups: DreGroupOption[];
  selectedIds: string[];
  autoDetectedIds: string[];
  onSave: (ids: string[]) => Promise<void>;
  isSaving: boolean;
  forceOpen?: boolean;
}

export function DreGroupsSelector({ allGroups, selectedIds, autoDetectedIds, onSave, isSaving, forceOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedIds));
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setDraft(new Set(selectedIds));
  }, [selectedIds.join(",")]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const filtered = allGroups.filter(g => g.label.toLowerCase().includes(filter.toLowerCase()));
  const effective = selectedIds.length > 0 ? selectedIds : autoDetectedIds;

  function toggle(id: string) {
    const next = new Set(draft);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDraft(next);
  }

  async function handleSave() {
    try {
      await onSave(Array.from(draft));
      toast({ title: "Grupos salvos", description: `${draft.size} grupos de Pessoal configurados.` });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  }

  function handleApplyAutoDetect() {
    setDraft(new Set(autoDetectedIds));
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Grupos DRE considerados como Pessoal</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {effective.length} grupo{effective.length !== 1 ? "s" : ""} ativo{effective.length !== 1 ? "s" : ""}
                </Badge>
                {selectedIds.length === 0 && autoDetectedIds.length > 0 && (
                  <Badge variant="outline" className="text-xs">auto-detectado</Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 mb-3">
              <Input
                placeholder="Filtrar grupos..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" variant="outline" onClick={handleApplyAutoDetect} disabled={autoDetectedIds.length === 0}>
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-detect
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3 w-3 mr-1" />
                Salvar
              </Button>
            </div>

            {allGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                DRE da Oxy ainda não carregou. Aguarde alguns segundos.
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto border border-border rounded">
                {filtered.map((g) => {
                  const isAuto = autoDetectedIds.includes(g.id);
                  const checked = draft.has(g.id);
                  return (
                    <label
                      key={g.id}
                      className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer text-sm"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(g.id)} />
                      <span className="flex-1 truncate text-foreground">{g.label}</span>
                      {isAuto && (
                        <Badge variant="outline" className="text-[10px] h-5">auto</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
