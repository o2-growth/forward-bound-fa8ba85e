import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import type { JornadaCfo, JornadaCliente } from "./types";

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const healthBarColor = (score: number) =>
  score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

const healthDot = (score: number) =>
  score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";

interface CfoViewProps {
  cfos: JornadaCfo[];
  clientes: JornadaCliente[];
}

type SortCol = "nome" | "clientes" | "mrrTotal" | "healthScoreMedio" | "taxaEntrega" | "clientesTratativa" | "mrrEmRisco";

const INACTIVE_PHASES = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

export function CfoView({ cfos, clientes }: CfoViewProps) {
  const [selectedCfo, setSelectedCfo] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("mrrTotal");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(col === "nome"); }
  };

  const sortedCfos = useMemo(() => {
    return [...cfos].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? ((av as number) ?? 0) - ((bv as number) ?? 0) : ((bv as number) ?? 0) - ((av as number) ?? 0);
    });
  }, [cfos, sortCol, sortAsc]);

  const activeClientes = useMemo(() => {
    return clientes.filter(c => !INACTIVE_PHASES.includes(c.faseAtual));
  }, [clientes]);

  const dialogClientes = useMemo(() => {
    if (!selectedCfo) return [];
    return activeClientes.filter(c => c.cfo === selectedCfo).sort((a, b) => b.mrr - a.mrr);
  }, [activeClientes, selectedCfo]);

  const selectedCfoData = cfos.find(c => c.nome === selectedCfo);

  return (
    <div className="space-y-6">
      {/* CFO Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cfos.map((cfo) => (
          <Card
            key={cfo.nome}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => setSelectedCfo(cfo.nome)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cfo.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {cfo.clientes} clientes | {formatCompact(cfo.mrrTotal)} MRR
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Health Score</span>
                  <span className="font-medium">{cfo.healthScoreMedio}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${healthBarColor(cfo.healthScoreMedio)}`}
                    style={{ width: `${cfo.healthScoreMedio}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge
                  className={
                    cfo.taxaEntrega >= 80
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : cfo.taxaEntrega >= 50
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }
                >
                  Entrega {cfo.taxaEntrega}%
                </Badge>

                <Badge
                  variant={cfo.clientesTratativa > 0 ? "default" : "secondary"}
                  className={cfo.clientesTratativa > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : ""}
                >
                  {cfo.clientesTratativa} em tratativa
                </Badge>

                {cfo.mrrEmRisco > 0 && (
                  <Badge variant="destructive">
                    {formatCompact(cfo.mrrEmRisco)} em risco
                  </Badge>
                )}

                <Badge variant="outline">
                  NPS {cfo.npsMediaClientes ?? "—"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comparativo CFOs</h3>
        <ScrollArea className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {([
                  ["nome", "CFO"],
                  ["clientes", "Clientes"],
                  ["mrrTotal", "MRR Total"],
                  ["healthScoreMedio", "Health"],
                  ["taxaEntrega", "Entrega %"],
                  ["clientesTratativa", "Tratativas"],
                  ["mrrEmRisco", "MRR Risco"],
                ] as [SortCol, string][]).map(([col, label]) => (
                  <TableHead key={col}>
                    <Button variant="ghost" size="sm" className="gap-1 -ml-3" onClick={() => handleSort(col)}>
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCfos.map((cfo) => (
                <TableRow
                  key={cfo.nome}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCfo(cfo.nome)}
                >
                  <TableCell className="font-medium">{cfo.nome}</TableCell>
                  <TableCell>{cfo.clientes}</TableCell>
                  <TableCell>{formatBRL(cfo.mrrTotal)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${healthDot(cfo.healthScoreMedio)}`} />
                      {cfo.healthScoreMedio}
                    </div>
                  </TableCell>
                  <TableCell>{cfo.taxaEntrega}%</TableCell>
                  <TableCell>{cfo.clientesTratativa}</TableCell>
                  <TableCell className={cfo.mrrEmRisco > 0 ? "text-red-600 font-medium" : ""}>
                    {formatBRL(cfo.mrrEmRisco)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* CFO Detail Dialog */}
      <Dialog open={!!selectedCfo} onOpenChange={(open) => !open && setSelectedCfo(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCfo} — {dialogClientes.length} clientes ativos</span>
              {selectedCfoData && (
                <span className="text-sm font-normal text-muted-foreground">
                  MRR: {formatCompact(selectedCfoData.mrrTotal)} | Health: {selectedCfoData.healthScoreMedio}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {dialogClientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum cliente ativo para este CFO</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Pontual</TableHead>
                  <TableHead className="text-right">Health</TableHead>
                  <TableHead className="text-right">NPS</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tratativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialogClientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        {c.titulo}
                        <a href={`https://app.pipefy.com/open-cards/${c.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{c.faseAtual}</Badge></TableCell>
                    <TableCell className="text-right">{formatBRL(c.mrr)}</TableCell>
                    <TableCell className="text-right text-purple-600">{c.pontual > 0 ? formatBRL(c.pontual) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${healthDot(c.healthScore)}`} />
                        {c.healthScore}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{c.ultimoNps ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{c.produto || "—"}</TableCell>
                    <TableCell>
                      {c.tratativaAtiva
                        ? <Badge variant="destructive" className="text-[10px]">{c.tratativaMotivo || "Ativa"}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
