import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ChevronDown, ChevronRight } from "lucide-react";
import type { PessoaRow } from "@/hooks/useHrData";
import { saneamentoStats } from "./helpers";

interface Props {
  rows: PessoaRow[];
}

export function SaneamentoCard({ rows }: Props) {
  const stats = useMemo(() => saneamentoStats(rows), [rows]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const issues = [
    {
      key: "contratacao",
      title: "Pessoas ativas sem Data de contratação",
      desc: "Bloqueia cálculo de tempo de casa e turnover voluntário/involuntário.",
      list: stats.semContratacao,
      severity: "high" as const,
    },
    {
      key: "desligamento",
      title: "Inativos sem campo dedicado de desligamento",
      desc: "Hoje usamos updated_at como proxy. Para Fase 2, criar 'Data de desligamento' e 'Motivo' no Pipefy DB Pessoas.",
      list: stats.inativosSemDesligamento,
      severity: "med" as const,
    },
    {
      key: "nascimento",
      title: "Pessoas ativas sem Data de nascimento",
      desc: "Reduz a cobertura da distribuição etária.",
      list: stats.semNascimento,
      severity: "low" as const,
    },
  ];

  const sevClass = (s: "high" | "med" | "low") =>
    s === "high" ? "border-destructive/40 bg-destructive/5"
    : s === "med" ? "border-amber-500/40 bg-amber-500/5"
    : "border-border bg-muted/20";

  const sevText = (s: "high" | "med" | "low") =>
    s === "high" ? "text-destructive" : s === "med" ? "text-amber-500" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          Saneamento de dados
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Lacunas no DB Pessoas que precisam ser tratadas para destravar a Fase 2.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.map((it) => {
          const isOpen = expanded === it.key;
          return (
            <div key={it.key} className={`rounded border p-3 ${sevClass(it.severity)}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : it.key)}
                className="w-full flex items-start justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-2">
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />}
                  <div>
                    <div className="text-sm font-medium text-foreground">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{it.desc}</div>
                  </div>
                </div>
                <div className={`text-lg font-semibold tabular-nums ${sevText(it.severity)} shrink-0`}>
                  {it.list.length}
                </div>
              </button>
              {isOpen && it.list.length > 0 && (
                <div className="mt-3 border-t border-border/40 pt-2 max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {it.list.slice(0, 50).map((p) => (
                        <tr key={p.ID} className="border-b border-border/20">
                          <td className="py-1 pr-2 text-foreground">{p.Nome || p["Título"] || "—"}</td>
                          <td className="py-1 px-1 text-muted-foreground">{p.Cargo || "—"}</td>
                          <td className="py-1 px-1 text-muted-foreground">{p.Time || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {it.list.length > 50 && (
                    <div className="text-[10px] text-muted-foreground mt-2 text-center">
                      ... e mais {it.list.length - 50}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
