import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wallet } from "lucide-react";
import { useOperationsData } from "@/hooks/useOperationsData";
import { fmtInt, MetricCard, AiNote, AguardandoFonte, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC: MetricSource = {
  origem: "useOperationsData — Pipefy Central de Projetos",
  periodo: "Snapshot atual",
  calculo: "Clientes em fases ativas vs encerradas.",
};

export function FinanceiroSection(_props: Props) {
  const ops = useOperationsData();
  const kpis = ops.data?.kpis;

  if (ops.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-muted-foreground" />Base de clientes</CardTitle>
          <p className="text-xs text-muted-foreground">Clientes ativos vs inativos — base para o acompanhamento de inadimplência.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard label="Clientes ativos" value={fmtInt(kpis?.totalAtivos)} large source={SRC} />
            <MetricCard label="Clientes inativos (churn)" value={fmtInt(kpis?.churn)} tone="danger" source={SRC} />
            <MetricCard label="Retenção" value={kpis?.retencaoRate != null ? `${kpis.retencaoRate.toFixed(1)}%` : "—"} source={SRC} />
          </div>
          <AiNote />
        </CardContent>
      </Card>

      <AguardandoFonte
        titulo="Inadimplência"
        descricao="Não há base de contas a receber / aging no app hoje. Para montar os filtros e cortes que o CEO pediu, é preciso conectar a fonte de inadimplência (ERP / financeiro)."
        itens={[
          "Inadimplência por prazo: 7 / 15 / 30 / 60 / 90 / 120 / 180 / 360 / 720 / +720 dias",
          "Inadimplência por BU: CaaS, SaaS, Expansão, TAX",
          "Inadimplência por produto: CFO Enterprise, BPO, Coordenador, Oxy+Gênio, Turnaround…",
          "Inadimplência por carteira de CFO",
        ]}
      />
    </div>
  );
}
