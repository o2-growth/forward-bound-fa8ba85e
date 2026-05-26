import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MetaRow {
  bu: string;
  month: string;
  year: number;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
  faturamento_meta: number | null;
  faturamento_vender: number | null;
  mrr_base_planejamento: number | null;
  investimento: number | null;
  is_locked: boolean | null;
}

const fmt = (v: number | null | undefined) => {
  if (v == null || isNaN(Number(v))) return "—";
  const n = Number(v);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return `R$ ${n.toFixed(0)}`;
};

const BU_LABEL: Record<string, string> = {
  modelo_atual: "Modelo Atual",
  oxy_hacker: "Oxy Hacker",
  franquia: "Franquia",
  o2_tax: "O2 Tax",
};

const MONTHS_ORDER = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DebugFunnelMetas() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("funnel_metas")
          .select("*")
          .eq("year", year)
          .order("bu")
          .order("month");
        if (err) throw err;
        setRows((data || []) as MetaRow[]);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [year]);

  // Build map: bu × month → row
  const byBuMonth = new Map<string, MetaRow>();
  rows.forEach(r => byBuMonth.set(`${r.bu}-${r.month}`, r));

  const bus = Array.from(new Set(rows.map(r => r.bu))).sort();

  // FOCO: linha de Maio (Mai) destacada
  const focusMonth = "Mai";

  const copyAll = () => {
    let txt = `═══════ funnel_metas (year=${year}, ${rows.length} rows) ═══════\n\n`;
    txt += `→ FOCO MAIO/${year}:\n`;
    for (const bu of bus) {
      const r = byBuMonth.get(`${bu}-${focusMonth}`);
      const label = BU_LABEL[bu] || bu;
      if (!r) {
        txt += `  ${label.padEnd(15)} ${focusMonth}: (sem linha)\n`;
      } else {
        txt += `  ${label.padEnd(15)} ${focusMonth}: vender=${fmt(r.faturamento_vender)} · total=${fmt(r.faturamento_meta)} · mrrBase=${fmt(r.mrr_base_planejamento)} · locked=${r.is_locked ? "SIM" : "não"}\n`;
      }
    }
    txt += `\n→ TODAS as linhas (BU/mês):\n`;
    for (const r of rows) {
      txt += `  ${(BU_LABEL[r.bu] || r.bu).padEnd(15)} ${r.month.padEnd(4)} | vender=${fmt(r.faturamento_vender).padEnd(10)} | total=${fmt(r.faturamento_meta).padEnd(10)} | mrrBase=${fmt(r.mrr_base_planejamento).padEnd(10)} | venda=${r.vendas}\n`;
    }
    navigator.clipboard.writeText(txt);
    alert("Copiado!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debug — funnel_metas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspeciona as metas de funil cadastradas no DB. Foco: <strong>Maio/{year}</strong>,
            campo <code>faturamento_vender</code> (Incremento de Receita).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded border bg-background text-sm"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={copyAll}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Copiar tudo
          </button>
        </div>
      </div>

      {loading && <div>Carregando…</div>}
      {error && (
        <div className="p-4 border border-red-500/30 bg-red-500/10 rounded text-sm">
          ❌ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* FOCO MAIO — destaque */}
          <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
            <h2 className="text-lg font-bold text-primary">🎯 Maio/{year} — Incremento de Receita (faturamento_vender)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">BU</th>
                  <th className="text-right py-2 px-3">A Vender (vender)</th>
                  <th className="text-right py-2 px-3">Total (meta)</th>
                  <th className="text-right py-2 px-3">MRR Base</th>
                  <th className="text-right py-2 px-3">Vendas Meta</th>
                  <th className="text-center py-2 px-3">Locked?</th>
                </tr>
              </thead>
              <tbody>
                {bus.map(bu => {
                  const r = byBuMonth.get(`${bu}-${focusMonth}`);
                  if (!r) {
                    return (
                      <tr key={bu} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{BU_LABEL[bu] || bu}</td>
                        <td colSpan={5} className="py-2 px-3 text-muted-foreground italic">
                          ❌ Sem linha cadastrada pra Mai/{year}
                        </td>
                      </tr>
                    );
                  }
                  const venderOk = (r.faturamento_vender || 0) > 0;
                  return (
                    <tr key={bu} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{BU_LABEL[bu] || bu}</td>
                      <td className={`py-2 px-3 text-right font-mono ${venderOk ? "text-green-600 font-bold" : "text-red-600"}`}>
                        {fmt(r.faturamento_vender)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(r.faturamento_meta)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(r.mrr_base_planejamento)}</td>
                      <td className="py-2 px-3 text-right font-mono">{r.vendas}</td>
                      <td className="py-2 px-3 text-center">{r.is_locked ? "🔒 Sim" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              <strong>Esperado conforme o admin:</strong> Modelo Atual 400k · Oxy Hacker 144k · Franquia 420k = <strong>964k total</strong>.
              Se algum valor aqui não bate, precisa cadastrar/atualizar no Plan Growth antes do gráfico funcionar.
            </p>
          </div>

          {/* Tabela completa */}
          <div>
            <h2 className="text-base font-semibold mb-2">Todas as linhas — {year}</h2>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium">BU</th>
                    <th className="text-left py-1.5 px-2 font-medium">Mês</th>
                    <th className="text-right py-1.5 px-2 font-medium">A Vender</th>
                    <th className="text-right py-1.5 px-2 font-medium">Total</th>
                    <th className="text-right py-1.5 px-2 font-medium">MRR Base</th>
                    <th className="text-right py-1.5 px-2 font-medium">Vendas</th>
                    <th className="text-right py-1.5 px-2 font-medium">Propostas</th>
                    <th className="text-right py-1.5 px-2 font-medium">RR</th>
                    <th className="text-right py-1.5 px-2 font-medium">RM</th>
                    <th className="text-right py-1.5 px-2 font-medium">MQL</th>
                    <th className="text-right py-1.5 px-2 font-medium">Leads</th>
                    <th className="text-center py-1.5 px-2 font-medium">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => {
                      const ai = MONTHS_ORDER.indexOf(a.month);
                      const bi = MONTHS_ORDER.indexOf(b.month);
                      if (a.bu !== b.bu) return a.bu.localeCompare(b.bu);
                      return ai - bi;
                    })
                    .map((r, i) => (
                      <tr
                        key={`${r.bu}-${r.month}-${i}`}
                        className={`border-t hover:bg-muted/30 ${r.month === focusMonth ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-1 px-2">{BU_LABEL[r.bu] || r.bu}</td>
                        <td className="py-1 px-2">{r.month}</td>
                        <td className="py-1 px-2 text-right font-mono">{fmt(r.faturamento_vender)}</td>
                        <td className="py-1 px-2 text-right font-mono">{fmt(r.faturamento_meta)}</td>
                        <td className="py-1 px-2 text-right font-mono">{fmt(r.mrr_base_planejamento)}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.vendas}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.propostas}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.rrs}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.rms}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.mqls}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{r.leads}</td>
                        <td className="py-1 px-2 text-center">{r.is_locked ? "🔒" : ""}</td>
                      </tr>
                    ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-6 text-center text-muted-foreground italic">
                        Nenhuma linha em funnel_metas para o ano {year}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
