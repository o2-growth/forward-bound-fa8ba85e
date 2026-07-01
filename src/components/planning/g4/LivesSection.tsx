import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtInt, fmtFull, fmt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteFunnelCard, type FunnelStep } from "./FrenteFunnelCard";
import { FrenteDreCard, type G4Dre, type CustoDetalhe } from "./FrenteDreCard";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface LiveRow {
  label: string;         // ex: 'Live 20/05'
  date: string;          // 'YYYY-MM-DD'
  saveCost: number;      // custo Save Studios
  pedroCost: number;     // honorários Pedro
  totalCost: number;     // saveCost + pedroCost
  leadsGerados: number;
}

export interface LivesSectionProps {
  // Métricas agregadas da frente Lives
  leads: number;
  pipe: number;
  faturamento: number;
  leadTimeMedio?: number;
  funnel: FunnelStep[];
  dre: G4Dre;
  custosDetalhe?: CustoDetalhe[];
  // Detalhamento por live
  livesRows: LiveRow[];
}

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
export function LivesSection({
  leads,
  pipe,
  faturamento,
  leadTimeMedio,
  funnel,
  dre,
  custosDetalhe,
  livesRows = [],
}: LivesSectionProps) {
  const rows = livesRows ?? [];
  const totalLeadsLives = rows.reduce((s, r) => s + r.leadsGerados, 0);
  const totalCustoLives = rows.reduce((s, r) => s + r.totalCost, 0);

  return (
    <div className="space-y-4">
      {/* Header frente */}
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Lives</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      {/* Métricas agregadas */}
      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      {/* Mini-cards por live */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rows.map((live) => (
            <div
              key={live.label}
              className="flex flex-col items-start gap-0.5 rounded-md border border-border bg-card px-3 py-2 text-sm min-w-[160px]"
            >
              <span className="font-semibold text-foreground">{live.label}</span>
              <span className="text-xs text-muted-foreground">
                {fmtInt(live.leadsGerados)} leads · {fmt(live.totalCost)}
              </span>
              <div className="mt-0.5 flex gap-2 text-[11px] text-muted-foreground/70">
                <span>Save: {fmtFull(live.saveCost)}</span>
                <span>Pedro: {fmtFull(live.pedroCost)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid: Funil + DRE */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FrenteFunnelCard
          title="Funil — Lives"
          funnel={funnel}
          leadTimeMedioDias={leadTimeMedio}
        />
        <FrenteDreCard
          title="P&L — Lives"
          dre={dre}
          custosDetalhe={custosDetalhe}
        />
      </div>

      {/* Tabela detalhada por live */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhamento por Live</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Live</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Save (R$)</TableHead>
                    <TableHead className="text-right">Pedro (R$)</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const cpl = row.leadsGerados > 0 ? row.totalCost / row.leadsGerados : 0;
                    return (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium text-sm">{row.label}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(row.date)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtFull(row.saveCost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtFull(row.pedroCost)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold">
                          {fmtFull(row.totalCost)}
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
                    <TableCell colSpan={4} className="font-bold">
                      Total ({rows.length} lives)
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {fmtFull(totalCustoLives)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {fmtInt(totalLeadsLives)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {totalLeadsLives > 0
                        ? fmtFull(totalCustoLives / totalLeadsLives)
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
