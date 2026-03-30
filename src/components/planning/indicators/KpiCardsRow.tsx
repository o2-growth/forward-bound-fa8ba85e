import { KpiCard, KpiItem } from "./KpiCard";

interface KpiCardsRowProps {
  kpis: KpiItem[];
}

export function KpiCardsRow({ kpis }: KpiCardsRowProps) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {kpis.map((kpi, index) => (
        <KpiCard key={index} {...kpi} />
      ))}
    </div>
  );
}
