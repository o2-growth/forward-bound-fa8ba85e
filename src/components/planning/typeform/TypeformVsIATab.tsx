import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Winner = "typeform" | "ia" | "—";

const KPIS: Array<{
  label: string;
  typeform: string;
  ia: string;
  delta: string;
  winner: Winner;
}> = [
  { label: "Agendamentos", typeform: "54", ia: "28", delta: "+92,9%", winner: "typeform" },
  { label: "Engajamento", typeform: "75,5%", ia: "37,5%", delta: "+38,0 p.p.", winner: "typeform" },
  { label: "Conv. MQL → Agendamento", typeform: "61,7%", ia: "n/d", delta: "—", winner: "typeform" },
];

const COMPARISON: Array<{ metric: string; ia: string; typeform: string; winner: Winner }> = [
  { metric: "MQLs", ia: "184", typeform: "60", winner: "—" },
  { metric: "Engajamento (resp/compl)", ia: "69 (37,5%)", typeform: "75,5% dos 60 MQLs", winner: "typeform" },
  { metric: "Agendamentos", ia: "28", typeform: "54", winner: "typeform" },
  { metric: "Conv. MQL → Agendamento", ia: "15,2%", typeform: "61,7%", winner: "typeform" },
  { metric: "Show-rate", ia: "42,9% (12 de 28)", typeform: "18,9% (7 de 37 MQLs)", winner: "ia" },
  { metric: "Vendas fechadas (60d)", ia: "3 (R$ 72k)", typeform: "0", winner: "ia" },
];

type BreakdownItem = { label: string; emoji: string; qty: number; pct: string };

const SHOW_RATE_BREAKDOWN_TYPEFORM: BreakdownItem[] = [
  { label: "Realizadas", emoji: "✅", qty: 7, pct: "18,9%" },
  { label: "Agendadas no futuro", emoji: "⏳", qty: 17, pct: "45,9%" },
  { label: "Perdidas pré-reunião", emoji: "❌", qty: 10, pct: "27,0%" },
  { label: "No-show / remarcar", emoji: "⚠️", qty: 3, pct: "8,1%" },
];

const SHOW_RATE_BREAKDOWN_IA: BreakdownItem[] = [
  { label: "Realizadas", emoji: "✅", qty: 12, pct: "42,9%" },
  { label: "Agendadas no futuro", emoji: "⏳", qty: 1, pct: "3,6%" },
  { label: "No-show / remarcar", emoji: "⚠️", qty: 8, pct: "28,6%" },
  { label: "Perdidas pré-reunião", emoji: "❌", qty: 7, pct: "25,0%" },
];



const IA_SALES = [
  {
    empresa: "Imperador Burger",
    setor: "Comércio",
    fat: "1-5M",
    setup: "R$ 32k",
    produto: "Assessoria+Gênio+Oxy",
    time: "Érica + Thiago Zanoni",
    agendou: "17/05",
    fechou: "26/05",
  },
  {
    empresa: "Firme Empreendimentos",
    setor: "Indústria",
    fat: "350-500k",
    setup: "R$ 30k",
    produto: "CaaS Corp+Gênio+Oxy",
    time: "Carlos + Thiago Zanoni",
    agendou: "20/05",
    fechou: "25/05",
  },
  {
    empresa: "MARCIO ANDRADE",
    setor: "Serviço",
    fat: "500k-1M",
    setup: "R$ 10k",
    produto: "Gênio+Oxy",
    time: "Daniel Trindade + Amanda Serafim",
    agendou: "05/04",
    fechou: "30/04",
  },
];

function WinnerBadge({ winner }: { winner: Winner }) {
  if (winner === "typeform") {
    return <Badge className="bg-primary text-primary-foreground hover:bg-primary">Typeform</Badge>;
  }
  if (winner === "ia") {
    return <Badge variant="secondary">Jéssica IA</Badge>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function KpiCard({ kpi }: { kpi: (typeof KPIS)[number] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Typeform</div>
            <div className="text-2xl font-bold text-foreground">{kpi.typeform}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Jéssica IA</div>
            <div className="text-2xl font-bold text-muted-foreground">{kpi.ia}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Δ</span>
          <span className="text-sm font-semibold text-primary">{kpi.delta}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TypeformVsIATab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Typeform vs Jéssica IA</h2>
          <p className="text-sm text-muted-foreground">
            Comparativo de canais de aquisição — janela de teste recente
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Período: 30 dias ativos da IA · Typeform ainda não completou 30 dias
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo completo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Métrica</th>
                <th className="py-2 pr-4 font-medium">Jéssica IA</th>
                <th className="py-2 pr-4 font-medium">Typeform O2</th>
                <th className="py-2 font-medium">Vencedor</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.metric} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.metric}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.ia}</td>
                  <td className="py-2.5 pr-4 text-foreground">{row.typeform}</td>
                  <td className="py-2.5">
                    <WinnerBadge winner={row.winner} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Show-rate Typeform O2 (37 MQLs agendados)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {SHOW_RATE_BREAKDOWN_TYPEFORM.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 text-2xl">{item.emoji}</div>
                  <div className="text-2xl font-bold text-foreground">{item.qty}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{item.pct}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Show-rate Jéssica IA (28 agendados)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {SHOW_RATE_BREAKDOWN_IA.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 text-2xl">{item.emoji}</div>
                  <div className="text-2xl font-bold text-foreground">{item.qty}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{item.pct}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas fechadas pela Jéssica IA (60d)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Empresa</th>
                <th className="py-2 pr-4 font-medium">Setor</th>
                <th className="py-2 pr-4 font-medium">Faturamento</th>
                <th className="py-2 pr-4 font-medium">Setup</th>
                <th className="py-2 pr-4 font-medium">Produto</th>
                <th className="py-2 pr-4 font-medium">SDR + Closer</th>
                <th className="py-2 pr-4 font-medium">IA agendou</th>
                <th className="py-2 font-medium">Fechou</th>
              </tr>
            </thead>
            <tbody>
              {IA_SALES.map((row) => (
                <tr key={row.empresa} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.empresa}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.setor}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.fat}</td>
                  <td className="py-2.5 pr-4 text-foreground">{row.setup}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.produto}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.time}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.agendou}</td>
                  <td className="py-2.5 text-foreground">{row.fechou}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8} className="pt-3 text-right text-xs font-semibold text-muted-foreground">
                  Total: 3 vendas · R$ 72k em Setup
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dados consolidados em 01/06/2026 — Typeform: painel O2. Jéssica IA: relatório operacional manual.
      </p>
    </div>
  );
}
