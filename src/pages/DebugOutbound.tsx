import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SchemaCol {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface FieldStat {
  field: string;
  uniqueValues: { value: string; count: number }[];
  totalRows: number;
  emptyCount: number;
}

const TABLE = "pipefy_moviment_outbound";

export default function DebugOutbound() {
  const [schema, setSchema] = useState<SchemaCol[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldStats, setFieldStats] = useState<FieldStat[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Pegar schema
        const { data: schemaData, error: schemaErr } = await supabase.functions.invoke(
          "query-external-db",
          { body: { table: TABLE, action: "schema" } }
        );
        if (schemaErr) throw schemaErr;
        const cols = (schemaData?.columns || []) as SchemaCol[];
        setSchema(cols);

        // 2) Pegar amostra (preview)
        const { data: previewData, error: prevErr } = await supabase.functions.invoke(
          "query-external-db",
          { body: { table: TABLE, action: "preview", limit: 2000 } }
        );
        if (prevErr) throw prevErr;
        const sampleRows = (previewData?.data || []) as any[];
        setRows(sampleRows);
        setTotalRows(parseInt(previewData?.totalRows ?? "0", 10));

        // 3) Estatísticas por campo (top valores únicos)
        if (sampleRows.length > 0) {
          const stats: FieldStat[] = cols.map((col) => {
            const counter = new Map<string, number>();
            let empty = 0;
            for (const r of sampleRows) {
              const raw = (r[col.column_name] ?? "").toString().trim();
              if (!raw) empty++;
              else counter.set(raw, (counter.get(raw) || 0) + 1);
            }
            return {
              field: col.column_name,
              uniqueValues: Array.from(counter.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count),
              totalRows: sampleRows.length,
              emptyCount: empty,
            };
          });
          setFieldStats(stats);
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const copyAll = () => {
    let txt = `═══════ ${TABLE} ═══════\n`;
    txt += `Total rows: ${totalRows}\nAmostra analisada: ${rows.length}\n\n`;
    txt += `── SCHEMA (${schema.length} colunas) ──\n`;
    for (const c of schema) txt += `  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})\n`;
    txt += "\n── VALORES POR CAMPO (top 20) ──\n";
    for (const f of fieldStats) {
      if (f.uniqueValues.length === 0) continue;
      txt += `\n· ${f.field} (${f.emptyCount} vazios de ${f.totalRows}, ${f.uniqueValues.length} únicos)\n`;
      for (const v of f.uniqueValues.slice(0, 20)) {
        txt += `   ${v.count.toString().padStart(4)}  ${v.value}\n`;
      }
    }
    navigator.clipboard.writeText(txt);
    alert("Copiado!");
  };

  if (loading) return <div className="p-8 text-foreground">Carregando schema e amostra de {TABLE}…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debug — {TABLE}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalRows !== null ? <>Total no DB: <strong>{totalRows.toLocaleString("pt-BR")}</strong> rows.</> : null}
            {" "}Amostra analisada: <strong>{rows.length.toLocaleString("pt-BR")}</strong> rows.
          </p>
        </div>
        <button
          onClick={copyAll}
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Copiar tudo
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-500/30 bg-red-500/10 rounded text-sm">
          ❌ {error}
          <p className="mt-2 text-xs text-muted-foreground">
            Se o erro for "Invalid table name", a edge function ainda não foi atualizada pra incluir {TABLE} na whitelist.
            Aguarde o redeploy automático da Lovable e tente de novo.
          </p>
        </div>
      )}

      {/* SCHEMA */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Schema ({schema.length} colunas)</h2>
        <div className="rounded border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left py-1.5 px-3 font-medium">Coluna</th>
                <th className="text-left py-1.5 px-3 font-medium">Tipo</th>
                <th className="text-left py-1.5 px-3 font-medium">Nullable</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((c) => (
                <tr key={c.column_name} className="border-t hover:bg-muted/30">
                  <td className="py-1 px-3 font-mono">{c.column_name}</td>
                  <td className="py-1 px-3 text-muted-foreground">{c.data_type}</td>
                  <td className="py-1 px-3 text-muted-foreground">{c.is_nullable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AMOSTRA */}
      {rows.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Primeira linha (sample)</h2>
          <pre className="text-xs p-3 bg-muted/30 rounded border overflow-x-auto max-h-96">
            {JSON.stringify(rows[0], null, 2)}
          </pre>
        </div>
      )}

      {/* VALORES POR CAMPO */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Top valores únicos por campo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldStats
            .filter((f) => f.uniqueValues.length > 0 && f.emptyCount < f.totalRows)
            .map((f) => (
              <div key={f.field} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm font-mono">{f.field}</h3>
                  <span className="text-xs text-muted-foreground">
                    {f.uniqueValues.length} únicos · {f.emptyCount} vazios
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {f.uniqueValues.slice(0, 25).map((v, i) => (
                        <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="py-1 pr-2 font-mono break-all">{v.value}</td>
                          <td className="text-right py-1 tabular-nums w-16">{v.count}</td>
                        </tr>
                      ))}
                      {f.uniqueValues.length > 25 && (
                        <tr>
                          <td colSpan={2} className="py-1 text-center text-muted-foreground italic">
                            … +{f.uniqueValues.length - 25} valores
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
