import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import type { DiagLeadFull } from "./useTypeformData";
import { exportLeadsCsv, normalize, type BreakdownBlock } from "./leadsFilters";

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: DetailField[];
  breakdowns?: BreakdownBlock[];
  leads?: DiagLeadFull[];
  leadsLoading?: boolean;
}

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export function TypeformDetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  fields,
  breakdowns = [],
  leads = [],
  leadsLoading = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiagLeadFull | null>(null);

  const filteredLeads = useMemo(() => {
    const q = normalize(search);
    if (!q) return leads;
    return leads.filter((l) =>
      [l.nome, l.email, l.empresa, l.telefone, l.sdr_nome].some((v) => normalize(v).includes(q))
    );
  }, [leads, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <Tabs defaultValue="resumo" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1"
                >
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </span>
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            {breakdowns.length > 0 && (
              <div className="space-y-4">
                {breakdowns.map((b, i) => (
                  <div key={i} className="rounded-lg border border-border">
                    <div className="px-3 py-2 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {b.title}
                    </div>
                    <div className="divide-y divide-border">
                      {b.rows.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Sem dados</div>
                      )}
                      {b.rows.map((r, j) => (
                        <div key={j} className="px-3 py-2 flex justify-between text-sm">
                          <span className="truncate pr-2">{r.label}</span>
                          <span className="tabular-nums text-muted-foreground">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome, email, empresa, SDR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLeadsCsv(filteredLeads, title)}
                disabled={!filteredLeads.length}
              >
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>

            {leadsLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Nenhum lead neste recorte.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left">
                        <th className="px-2 py-2 font-medium">Nome / Empresa</th>
                        <th className="px-2 py-2 font-medium">Faturamento</th>
                        <th className="px-2 py-2 font-medium">SDR</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 200).map((l, i) => (
                        <tr
                          key={l.response_id ?? i}
                          onClick={() => setSelected(l)}
                          role="button"
                          tabIndex={0}
                          className="border-t border-border cursor-pointer hover:bg-muted/30"
                        >
                          <td className="px-2 py-2">
                            <div className="font-medium text-foreground truncate max-w-[180px]">
                              {l.nome || "—"}
                            </div>
                            <div className="text-muted-foreground truncate max-w-[180px]">
                              {l.empresa || l.email || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">{l.faturamento || "—"}</td>
                          <td className="px-2 py-2 text-muted-foreground truncate max-w-[120px]">
                            {l.sdr_nome || "—"}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {l.is_mql && <Badge variant="default" className="h-4 px-1 text-[10px]">MQL</Badge>}
                              {l.completo && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Compl</Badge>}
                              {l.agendado && <Badge variant="outline" className="h-4 px-1 text-[10px]">Ag</Badge>}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                            {fmtDate(l.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredLeads.length > 200 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                    Mostrando 200 de {filteredLeads.length}. Use a busca ou exporte CSV.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected?.nome || selected?.email || "Lead"}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(selected)
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => (
                    <div key={k} className="border border-border rounded p-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {k}
                      </div>
                      <div className="break-words">{String(v)}</div>
                    </div>
                  ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
