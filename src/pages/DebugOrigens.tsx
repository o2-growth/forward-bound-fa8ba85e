import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FieldStat {
  field: string;
  uniqueValues: { value: string; count: number }[];
  totalRows: number;
  emptyCount: number;
}

interface PipeReport {
  table: string;
  rowCount: number;
  fields: FieldStat[];
  error?: string;
}

const PIPES = [
  { table: "pipefy_moviment_cfos", label: "Modelo Atual (CFOs)" },
  { table: "pipefy_cards_movements_expansao", label: "Expansão (Franquia / Oxy Hacker)" },
];

const FIELDS_TO_INSPECT = [
  "Tipo de Origem do lead",
  "Origem do lead",
  "Fonte",
  "Campanha",
  "Página de origem",
  "Conjunto/grupo",
];

export default function DebugOrigens() {
  const [reports, setReports] = useState<PipeReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const out: PipeReport[] = [];
      for (const p of PIPES) {
        try {
          const { data, error } = await supabase.functions.invoke("query-external-db", {
            body: { table: p.table, action: "preview", limit: 3000 },
          });
          if (error) throw error;
          const rows: any[] = data?.data || [];
          const fields: FieldStat[] = FIELDS_TO_INSPECT.map((field) => {
            const counter = new Map<string, number>();
            let empty = 0;
            for (const r of rows) {
              const raw = (r[field] ?? "").toString().trim();
              if (!raw) {
                empty++;
              } else {
                counter.set(raw, (counter.get(raw) || 0) + 1);
              }
            }
            const uniqueValues = Array.from(counter.entries())
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count);
            return { field, uniqueValues, totalRows: rows.length, emptyCount: empty };
          });
          out.push({ table: p.table, rowCount: rows.length, fields });
        } catch (e: any) {
          out.push({ table: p.table, rowCount: 0, fields: [], error: e?.message || String(e) });
        }
      }
      setReports(out);
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div className="p-8 text-foreground">Carregando dados dos pipes…</div>;

  const copyAll = () => {
    let txt = "";
    for (const r of reports) {
      txt += `═══════ ${r.table} (${r.rowCount} rows) ═══════\n`;
      if (r.error) {
        txt += `ERRO: ${r.error}\n\n`;
        continue;
      }
      for (const f of r.fields) {
        txt += `\n── ${f.field} (${f.emptyCount} vazios de ${f.totalRows}) ──\n`;
        for (const v of f.uniqueValues.slice(0, 30)) {
          txt += `  ${v.count.toString().padStart(4)}  ${v.value}\n`;
        }
      }
      txt += "\n";
    }
    navigator.clipboard.writeText(txt);
    alert("Copiado!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debug — Valores de origem nos pipes do funil</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista os valores distintos (top 30) dos campos relacionados a origem do lead.
            Use pra mapear "Inbound / Outbound / Evento" no classificador.
          </p>
        </div>
        <button
          onClick={copyAll}
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Copiar tudo
        </button>
      </div>

      {reports.map((r) => (
        <div key={r.table} className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">
            {r.table} <span className="text-muted-foreground text-sm font-normal">— {r.rowCount} rows</span>
          </h2>
          {r.error && (
            <div className="p-4 border border-red-500/30 bg-red-500/10 rounded text-sm">
              ❌ {r.error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {r.fields.map((f) => (
              <div key={f.field} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{f.field}</h3>
                  <span className="text-xs text-muted-foreground">
                    {f.uniqueValues.length} únicos · {f.emptyCount} vazios
                  </span>
                </div>
                {f.uniqueValues.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Todos vazios.</p>
                ) : (
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left py-1 pr-2">Valor</th>
                          <th className="text-right py-1 w-16">Qtd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.uniqueValues.slice(0, 30).map((v, i) => (
                          <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                            <td className="py-1 pr-2 font-mono">{v.value}</td>
                            <td className="text-right py-1 tabular-nums">{v.count}</td>
                          </tr>
                        ))}
                        {f.uniqueValues.length > 30 && (
                          <tr>
                            <td colSpan={2} className="py-2 text-center text-muted-foreground italic">
                              … e mais {f.uniqueValues.length - 30} valores
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
