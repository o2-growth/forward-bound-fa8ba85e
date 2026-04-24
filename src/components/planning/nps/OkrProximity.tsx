interface OkrProximityProps {
  npsScore: number;
  csatScore: number;
  visible: boolean;
}

export function OkrProximity({ npsScore, csatScore, visible }: OkrProximityProps) {
  if (!visible) return null;

  // Valores CONSOLIDADOS do Q1 (trimestre inteiro, não último mês)
  const ltMedio = 5.2;      // Consolidado (c): média ponderada
  const logoChurn = 19.79;  // Consolidado (b): 25 clientes / 126.3 média
  const revenueChurn = 5.95; // Consolidado (a): R$139.272,50 / R$2.341.745,87

  const krs = [
    { label: 'Manter LT acima de 8 meses', value: `${ltMedio} meses`, meta: 'Meta: 8 meses', pct: (ltMedio / 8) * 100, hit: ltMedio >= 8, showBar: true },
    { label: 'Manter Logo Churn abaixo de 5%', value: `${logoChurn}%`, meta: 'Meta: 5%', pct: 100 - ((logoChurn - 5) / 5) * 100, hit: logoChurn <= 5, showBar: false },
    { label: 'Manter Revenue Churn abaixo de 5%', value: `${revenueChurn}%`, meta: 'Meta: 5%', pct: 100 - ((revenueChurn - 5) / 5) * 100, hit: revenueChurn <= 5, showBar: false },
    { label: 'Manter NPS (90-100) acima de 40', value: String(npsScore), meta: 'Meta: 40', pct: (npsScore / 40) * 100, hit: npsScore >= 40, showBar: false },
    { label: 'Manter CSAT acima de 80%', value: `${csatScore}%`, meta: 'Meta: 80%', pct: (csatScore / 80) * 100, hit: csatScore >= 80, showBar: false },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>&#8857;</span> Proximidade das Metas (KRs) — Q1/2026 (Consolidado)
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
