import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtInt, fmtFull, fmt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteFunnelCard, type FunnelStep } from "./FrenteFunnelCard";
import { FrenteDreCard, type G4Dre, type CustoDetalhe } from "./FrenteDreCard";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface EventoRow {
  label: string;        // ex: 'G4 TOOLS CONNECT 06/05'
  date: string;         // 'YYYY-MM-DD'
  custo: number;        // 0 = TODO (não preenchido ainda)
  leadsGerados: number;
}

export interface EventosSectionProps {
  // Métricas agregadas da frente Eventos
  leads?: number;
  pipe?: number;
  faturamento?: number;
  leadTimeMedio?: number;
  funnel?: FunnelStep[];
  dre?: G4Dre;
  custosDetalhe?: CustoDetalhe[];
  // Detalhamento por evento
  eventosRows?: EventoRow[];
}

const ZERO_DRE: G4Dre = {
  receitaBruta: 0,
  imposto: 0,
  comissaoG4: 0,
  custosOperacionais: 0,
  lucroLiquido: 0,
};

// ── Helpers ────────────────────────────────────────────────────────────
function fmtDate(dateStr: string): string {
  try {
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  } catch {
    return dateStr;
  }
}

// ── Componente ─────────────────────────────────────────────────────────
export function EventosSection({
  leads = 0,
  pipe = 0,
  faturamento = 0,
  leadTimeMedio,
  funnel = [],
  dre = ZERO_DRE,
  custosDetalhe,
  eventosRows = [],
}: EventosSectionProps) {
  const rows = eventosRows ?? [];
  const totalLeadsEventos = rows.reduce((s, r) => s + r.leadsGerados, 0);
  const totalCustoEventos = rows.reduce((s, r) => s + r.custo, 0);
  const hasCustosPendentes = rows.some((r) => r.custo === 0);

  return (
    <div className="space-y-4">
      {/* Header frente */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Eventos</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      {/* TODO banner de custos pendentes */}
      {hasCustosPendentes && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Custos pendentes:</strong> um ou mais eventos ainda não têm custo preenchido.
            O DRE de Eventos está subestimado.{" "}
            {/* TODO: conectar à planilha de custos — iteração futura */}
            <span className="italic text-amber-700 dark:text-amber-400">
              (Preencher via planilha de custos G4 — iteração futura)
            </span>
          </span>
        </div>
      )}

      {/* Métricas agregadas */}
      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      {/* Grid: Funil + DRE */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FrenteFunnelCard
          title="Funil — Eventos"
          funnel={funnel}
          leadTimeMedioDias={leadTimeMedio}
        />
        <FrenteDreCard
          title="P&L — Eventos"
          dre={dre}
          custosDetalhe={custosDetalhe}
        />
      </div>

      {/* Tabela detalhada por evento */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Detalhamento por Evento</CardTitle>
              {hasCustosPendentes && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 text-xs">
                  Custos a preencher
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Custo (R$)</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const cpl =
                      row.custo > 0 && row.leadsGerados > 0
                        ? row.custo / row.leadsGerados
                        : 0;
                    return (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate" title={row.label}>
                          {row.label}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(row.date)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {row.custo > 0 ? (
                            fmtFull(row.custo)
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400 text-xs">
                              TODO
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtInt(row.leadsGerados)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-sm",
                            cpl > 0 ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {cpl > 0 ? fmtFull(cpl) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">
                      Total ({rows.length} eventos)
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {totalCustoEventos > 0 ? fmtFull(totalCustoEventos) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {fmtInt(totalLeadsEventos)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {totalCustoEventos > 0 && totalLeadsEventos > 0
                        ? fmtFull(totalCustoEventos / totalLeadsEventos)
                        : "—"}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
