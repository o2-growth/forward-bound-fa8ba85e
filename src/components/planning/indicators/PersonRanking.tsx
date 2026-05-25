import { useMemo } from "react";
import { DetailItem } from "./DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import { useSdrMetas } from "@/hooks/useSdrMetas";
import { useCloserAbsoluteMetas, firstNameKey } from "@/hooks/useCloserAbsoluteMetas";
import { getMonthFactors, MonthFactor } from "@/lib/businessDayProrate";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Role = 'sdr' | 'closer';
type Field = 'rm' | 'rr' | 'proposta' | 'venda' | 'faturamento';

const FIELDS: { key: Field; label: string; color: string; monetary?: boolean }[] = [
  { key: 'rm', label: 'RM', color: '#22c55e' },
  { key: 'rr', label: 'RR', color: '#f59e0b' },
  { key: 'proposta', label: 'Prop', color: '#a855f7' },
  { key: 'venda', label: 'Venda', color: '#ef4444' },
  { key: 'faturamento', label: 'Faturamento', color: '#10b981', monetary: true },
];

// Para o cálculo: faturamento só faz sentido para closer (não SDR).
const FIELDS_BY_ROLE: Record<Role, Field[]> = {
  sdr: ['rm', 'rr', 'proposta', 'venda'],
  closer: ['rm', 'rr', 'proposta', 'venda', 'faturamento'],
};

const formatCurrencyCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${Math.round(v)}`;
};

interface PersonRankingProps {
  role: Role;
  itemsByIndicator: Record<string, DetailItem[]>;
  startDate: Date;
  endDate: Date;
  /** BUs filtradas (usado para somar metas de SDR por BU). */
  selectedBUs: string[];
}

function getPersonName(item: DetailItem, role: Role): { display: string; group: string } {
  // SDR: usa SOMENTE item.sdr (sem fallback para responsible/closer)
  const raw = role === 'sdr'
    ? (item.sdr || '').trim()
    : (item.closer || '').trim();
  if (!raw) return { display: role === 'sdr' ? 'Sem SDR' : 'Sem Closer', group: '__none__' };
  // Agrupa por primeiro nome normalizado para não duplicar variações ('Carlos' vs 'Carlos Ramos')
  return { display: raw, group: firstNameKey(raw) || raw.toLowerCase() };
}

function aggregateCounts(
  items: Record<string, DetailItem[]>,
  startTime: number,
  endTime: number,
  role: Role,
) {
  // counts: quantidade de cards por etapa do funil (rm/rr/proposta/venda)
  // faturamento: soma do .value das vendas (mesma definição usada nos cards de
  // Vendas em R$ do gauge) — só faz sentido para closer.
  const groups = new Map<string, { display: string; counts: Record<Field, number> }>();
  const countableFields: Field[] = ['rm', 'rr', 'proposta', 'venda'];
  for (const key of countableFields) {
    const arr = items[key] || [];
    for (const it of arr) {
      if (!it.date) continue;
      const t = new Date(it.date).getTime();
      if (t < startTime || t > endTime) continue;
      const { display, group } = getPersonName(it, role);
      const ex = groups.get(group);
      if (ex) {
        ex.counts[key] = (ex.counts[key] || 0) + 1;
        if (display.length > ex.display.length) ex.display = display;
      } else {
        groups.set(group, {
          display,
          counts: { rm: 0, rr: 0, proposta: 0, venda: 0, faturamento: 0, [key]: 1 } as Record<Field, number>,
        });
      }
    }
  }
  // Faturamento: soma .value dos itens de venda no período
  const vendas = items['venda'] || [];
  for (const it of vendas) {
    if (!it.date) continue;
    const t = new Date(it.date).getTime();
    if (t < startTime || t > endTime) continue;
    const { display, group } = getPersonName(it, role);
    const valor = it.value || 0;
    const ex = groups.get(group);
    if (ex) {
      ex.counts.faturamento = (ex.counts.faturamento || 0) + valor;
    } else {
      groups.set(group, {
        display,
        counts: { rm: 0, rr: 0, proposta: 0, venda: 0, faturamento: valor } as Record<Field, number>,
      });
    }
  }
  return groups;
}

function sumProrated(monthly: Record<string, number>, factors: MonthFactor[]): number {
  let total = 0;
  for (const f of factors) {
    const k = `${f.month}-${f.year}`;
    total += (monthly[k] ?? 0) * f.factor;
  }
  return total;
}

export function PersonRanking({ role, itemsByIndicator, startDate, endDate, selectedBUs }: PersonRankingProps) {
  const roleLabel = role === 'sdr' ? 'SDR' : 'Closer';
  const sdrMetasHook = useSdrMetas();
  const closerAbsHook = useCloserAbsoluteMetas();

  const startTime = startDate.getTime();
  const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
  const monthFactors = useMemo(() => getMonthFactors(startDate, endDate), [startDate, endDate]);

  const rows = useMemo(() => {
    const groups = aggregateCounts(itemsByIndicator, startTime, endTime, role);
    if (groups.size === 0) return [];

    const out = Array.from(groups.values()).map(g => {
      // Meta por pessoa, com rateio por dias úteis
      const metasByField: Record<Field, number | null> = {
        rm: null, rr: null, proposta: null, venda: null, faturamento: null,
      };

      if (role === 'sdr') {
        // Mapeia metas mensais somando todas BUs ativas para esse SDR (match por primeiro nome)
        const monthlyRm: Record<string, number> = {};
        const monthlyRr: Record<string, number> = {};
        const targetKey = firstNameKey(g.display);
        for (const m of sdrMetasHook.metas) {
          if (firstNameKey(m.sdr) !== targetKey) continue;
          if (selectedBUs.length > 0 && !selectedBUs.includes(m.bu)) continue;
          const key = `${m.month}-${m.year}`;
          monthlyRm[key] = (monthlyRm[key] || 0) + (m.rm_meta || 0);
          monthlyRr[key] = (monthlyRr[key] || 0) + (m.rr_meta || 0);
        }
        const rmMeta = sumProrated(monthlyRm, monthFactors);
        const rrMeta = sumProrated(monthlyRr, monthFactors);
        metasByField.rm = rmMeta > 0 ? rmMeta : null;
        metasByField.rr = rrMeta > 0 ? rrMeta : null;
        // Prop/Venda: sem meta cadastrada para SDR
      } else {
        const monthly = closerAbsHook.getMonthlyMap(g.display);
        const rm = sumProrated(monthly.rm, monthFactors);
        const rr = sumProrated(monthly.rr, monthFactors);
        const prop = sumProrated(monthly.prop, monthFactors);
        const venda = sumProrated(monthly.venda, monthFactors);
        const fat = sumProrated(monthly.faturamento, monthFactors);
        metasByField.rm = rm > 0 ? rm : null;
        metasByField.rr = rr > 0 ? rr : null;
        metasByField.proposta = prop > 0 ? prop : null;
        metasByField.venda = venda > 0 ? venda : null;
        metasByField.faturamento = fat > 0 ? fat : null;
      }

      // % atingimento por field — só considera fields aplicáveis ao role
      const pcts: Record<Field, number | null> = { rm: null, rr: null, proposta: null, venda: null, faturamento: null };
      const validPcts: number[] = [];
      const fieldsForRole = FIELDS.filter(f => FIELDS_BY_ROLE[role].includes(f.key));
      for (const { key } of fieldsForRole) {
        const meta = metasByField[key];
        if (meta === null || meta <= 0) {
          pcts[key] = null;
        } else {
          const p = (g.counts[key] || 0) / meta;
          pcts[key] = p;
          validPcts.push(p);
        }
      }
      const avgPct = validPcts.length > 0
        ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length
        : null;

      return {
        display: g.display,
        counts: g.counts,
        metas: metasByField,
        pcts,
        avgPct,
      };
    });

    out.sort((a, b) => {
      const aP = a.avgPct ?? -1;
      const bP = b.avgPct ?? -1;
      if (bP !== aP) return bP - aP;
      return (b.counts.venda || 0) - (a.counts.venda || 0);
    });

    return out;
  }, [itemsByIndicator, startTime, endTime, role, sdrMetasHook.metas, closerAbsHook, monthFactors, selectedBUs]);

  if (rows.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Sem dados de {roleLabel} no período selecionado.
      </div>
    );
  }

  const visibleFields = FIELDS.filter(f => FIELDS_BY_ROLE[role].includes(f.key));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-2 py-2 font-medium text-muted-foreground w-12">#</th>
            <th className="text-left px-2 py-2 font-medium text-muted-foreground min-w-[160px]">{roleLabel}</th>
            {visibleFields.map(f => (
              <th key={f.key} className="text-right px-2 py-2 font-medium text-muted-foreground min-w-[140px]" style={{ color: f.color }}>
                {f.label} (real / meta / %)
              </th>
            ))}
            <th className="text-right px-2 py-2 font-medium text-muted-foreground min-w-[100px]">% Médio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pos = i + 1;
            const posColor = pos === 1 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
              : pos === 2 ? 'bg-slate-400/20 text-slate-700 dark:text-slate-200 border-slate-400/40'
              : pos === 3 ? 'bg-orange-600/20 text-orange-700 dark:text-orange-300 border-orange-600/40'
              : 'bg-muted/40 text-muted-foreground border-muted-foreground/20';
            return (
              <tr key={r.display} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-2 py-2">
                  <Badge variant="outline" className={posColor}>{pos}º</Badge>
                </td>
                <td className="px-2 py-2 font-medium">{r.display}</td>
                {visibleFields.map(f => {
                  const real = r.counts[f.key] || 0;
                  const meta = r.metas[f.key];
                  const pct = r.pcts[f.key];
                  const fmtReal = f.monetary ? formatCurrencyCompact(real) : String(real);
                  const fmtMeta = meta === null ? '—' : (f.monetary ? formatCurrencyCompact(meta) : meta.toFixed(1));
                  return (
                    <td key={f.key} className="px-2 py-2 text-right tabular-nums">
                      {meta === null ? (
                        <span className="text-muted-foreground">{fmtReal} / — / —</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="font-medium">{fmtReal}</span>
                            <span className="text-muted-foreground"> / {fmtMeta} / </span>
                            <span className={(pct ?? 0) >= 1 ? 'text-green-600 dark:text-green-400 font-medium' : (pct ?? 0) >= 0.7 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                              {((pct ?? 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={Math.min(100, (pct ?? 0) * 100)} className="h-1" />
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right tabular-nums font-semibold">
                  {r.avgPct === null ? '—' : `${(r.avgPct * 100).toFixed(0)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
