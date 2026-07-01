import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MetricCard, fmt, fmtInt, fmtFull } from "@/components/planning/ceo/ceoShared";
import { Users, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface FrenteSnapshot {
  label: string;
  leads: number;
  pipe: number;
  faturamento: number;
  lucro: number;
}

export interface OverviewSectionProps {
  totalLeads: number;
  totalPipe: number;
  totalFaturado: number;
  totalLucro: number;
  lives: FrenteSnapshot;
  eventos: FrenteSnapshot;
  seller: FrenteSnapshot;
}

// ── Componente ─────────────────────────────────────────────────────────
export function OverviewSection({
  totalLeads,
  totalPipe,
  totalFaturado,
  totalLucro,
  lives,
  eventos,
  seller,
}: OverviewSectionProps) {
  const frentes: FrenteSnapshot[] = [lives, eventos, seller];

  const totals: FrenteSnapshot = {
    label: "Total G4",
    leads: totalLeads,
    pipe: totalPipe,
    faturamento: totalFaturado,
    lucro: totalLucro,
  };

  return (
    <div className="space-y-4">
      {/* KPIs Agregados */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total Leads G4"
          value={fmtInt(totalLeads)}
          sublabel={`Lives ${fmtInt(lives.leads)} · Eventos ${fmtInt(eventos.leads)} · Seller ${fmtInt(seller.leads)}`}
          icon={<Users className="h-4 w-4" />}
          tone="default"
        />
        <MetricCard
          label="Pipe Ativo Total"
          value={fmt(totalPipe)}
          sublabel={`Vendido ${fmt(totalFaturado)}`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone={totalPipe > 0 ? "success" : "default"}
        />
        <MetricCard
          label="Faturamento Total"
          value={fmt(totalFaturado)}
          sublabel={`Lucro líquido ${fmtFull(totalLucro)}`}
          icon={<DollarSign className="h-4 w-4" />}
          tone={totalLucro > 0 ? "success" : totalLucro < 0 ? "danger" : "default"}
        />
      </div>

      {/* Tabela comparativa entre frentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparativo por Frente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Frente</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Pipe Ativo</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Lucro Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frentes.map((f) => (
                  <TableRow key={f.label}>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="font-normal">
                        {f.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtInt(f.leads)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmt(f.pipe)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmt(f.faturamento)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums text-sm font-semibold",
                        f.lucro > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : f.lucro < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {fmtFull(f.lucro)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">{totals.label}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmtInt(totals.leads)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(totals.pipe)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {fmt(totals.faturamento)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-bold",
                      totals.lucro > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : totals.lucro < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {fmtFull(totals.lucro)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
