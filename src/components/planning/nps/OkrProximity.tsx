import { DataSourceInfo } from '@/components/planning/cs/DataSourceInfo';
import { DS } from '@/components/planning/cs/dataSources';
import { useOkrMetas, type OkrMeta } from '@/hooks/useOkrMetas';

interface OkrProximityProps {
  npsScore: number;
  csatScore: number;
  visible: boolean;
}

// Valores realizados consolidados Q1 (fonte: mesma dos cálculos atuais do dashboard)
const REALIZED_Q1: Record<string, number> = {
  lt_medio: 5.2,
  logo_churn: 19.79,
  revenue_churn: 5.95,
};

// Fallback caso a tabela esteja vazia — mantém comportamento atual intacto
const FALLBACK_KRS: OkrMeta[] = [
  { id: 'f1', kr_key: 'lt_medio',      label: 'Manter LT acima de 8 meses',         target_value: 8,  unit: 'meses',  direction: 'gte', period: 'Q1/2026', year: 2026, quarter: 1, display_order: 1, is_active: true, created_at: '', updated_at: '' },
  { id: 'f2', kr_key: 'logo_churn',    label: 'Manter Logo Churn abaixo de 5%',     target_value: 5,  unit: '%',      direction: 'lte', period: 'Q1/2026', year: 2026, quarter: 1, display_order: 2, is_active: true, created_at: '', updated_at: '' },
  { id: 'f3', kr_key: 'revenue_churn', label: 'Manter Revenue Churn abaixo de 5%',  target_value: 5,  unit: '%',      direction: 'lte', period: 'Q1/2026', year: 2026, quarter: 1, display_order: 3, is_active: true, created_at: '', updated_at: '' },
  { id: 'f4', kr_key: 'nps_score',     label: 'Manter NPS (90-100) acima de 40',    target_value: 40, unit: 'pontos', direction: 'gte', period: 'Q1/2026', year: 2026, quarter: 1, display_order: 4, is_active: true, created_at: '', updated_at: '' },
  { id: 'f5', kr_key: 'csat_score',    label: 'Manter CSAT acima de 80%',           target_value: 80, unit: '%',      direction: 'gte', period: 'Q1/2026', year: 2026, quarter: 1, display_order: 5, is_active: true, created_at: '', updated_at: '' },
];

function formatValue(val: number, unit: string): string {
  if (unit === 'meses') return `${val} meses`;
  if (unit === '%') return `${val}%`;
  return String(val);
}

function formatMeta(val: number, unit: string): string {
  if (unit === 'meses') return `Meta: ${val} meses`;
  if (unit === '%') return `Meta: ${val}%`;
  return `Meta: ${val}`;
}

export function OkrProximity({ npsScore, csatScore, visible }: OkrProximityProps) {
  const { data: metas } = useOkrMetas('Q1/2026');

  if (!visible) return null;

  const active = (metas && metas.length > 0 ? metas : FALLBACK_KRS).filter(m => m.is_active);

  const krs = active.map((m) => {
    let realized: number | null = null;
    if (m.kr_key === 'nps_score') realized = npsScore;
    else if (m.kr_key === 'csat_score') realized = csatScore;
    else if (m.kr_key in REALIZED_Q1) realized = REALIZED_Q1[m.kr_key];

    const target = Number(m.target_value);
    const hit = realized !== null && (m.direction === 'gte' ? realized >= target : realized <= target);
    const pct = realized === null
      ? 0
      : m.direction === 'gte'
        ? (realized / target) * 100
        : 100 - ((realized - target) / target) * 100;

    return {
      label: m.label,
      value: realized !== null ? formatValue(realized, m.unit) : '—',
      meta: formatMeta(target, m.unit),
      pct,
      hit: !!hit,
      showBar: m.kr_key === 'lt_medio',
    };
  });

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>&#8857;</span> Proximidade das Metas (KRs) — Q1/2026 (Consolidado)
        <DataSourceInfo source={DS.NPS_OKR} />
      </h3>
      <p className="text-sm text-muted-foreground">Responsável: Andréa Franzen</p>
      <div className="space-y-2">
        {krs.map((kr, i) => (
          <div key={i} className="flex items-center justify-between border rounded-lg p-4">
            <div className="flex items-center gap-3 flex-1">
              <span className={`text-lg ${kr.hit ? 'text-green-500' : 'text-red-500'}`}>
                {kr.hit ? '\u2705' : '\u2297'}
              </span>
              <div className="flex-1">
                <span className="font-medium">{kr.label}</span>
                {kr.showBar && (
                  <div className="w-full bg-muted rounded-full h-2.5 mt-2 max-w-md">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, kr.pct))}%` }} />
                  </div>
                )}
              </div>
            </div>
            <span className={`text-sm font-medium whitespace-nowrap ${kr.hit ? 'text-green-600' : 'text-red-500'}`}>
              {kr.value} / {kr.meta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
