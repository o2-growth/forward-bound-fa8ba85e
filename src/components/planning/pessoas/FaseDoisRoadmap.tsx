import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map as MapIcon, AlertCircle, Clock } from "lucide-react";

type Status = "falta-dado" | "em-definicao" | "parcial";

interface RoadmapRow {
  indicador: string;
  descricao: string;
  blocker: string;
  responsavel: string;
  status: Status;
  valorParcial?: string;
}

interface Props {
  /** Total de desligados no período — usado como entrega parcial do indicador de turnover voluntário/involuntário. */
  desligadosNoPeriodo: number;
  /** Headcount atual — entrega parcial de "Headcount vs orçado". */
  headcountAtual: number;
  /** Custo de pessoal total no período — entrega parcial de "Folha vs orçado". */
  custoPessoalTotal: number;
}

const formatCurrency = (v: number) => {
  if (!v) return "R$ 0";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

export function FaseDoisRoadmap({ desligadosNoPeriodo, headcountAtual, custoPessoalTotal }: Props) {
  const rows: RoadmapRow[] = [
    {
      indicador: "Turnover voluntário × involuntário",
      descricao: "Separar pedidos de saída de desligamentos por iniciativa da empresa",
      blocker: "Campo 'motivo de desligamento' no Pipefy DB Pessoas",
      responsavel: "RH / Ops",
      status: "parcial",
      valorParcial: desligadosNoPeriodo > 0 ? `${desligadosNoPeriodo} desligado(s) no período (sem split)` : undefined,
    },
    {
      indicador: "Custo de pessoal por área",
      descricao: "Folha distribuída entre áreas/centros de custo",
      blocker: "Centro de custo por área no Conta Azul / Oxy Finance",
      responsavel: "Financeiro",
      status: "falta-dado",
    },
    {
      indicador: "Headcount vs. orçado",
      descricao: "Comparar headcount realizado contra plano de headcount",
      blocker: "Plano de headcount mensal formalizado",
      responsavel: "RH / Diretoria",
      status: "parcial",
      valorParcial: `${headcountAtual} pessoa(s) ativas (sem orçado)`,
    },
    {
      indicador: "Folha vs. orçado",
      descricao: "Comparar custo de pessoal realizado contra orçamento",
      blocker: "Orçamento de folha mensal por BU",
      responsavel: "Financeiro / Diretoria",
      status: "parcial",
      valorParcial: `${formatCurrency(custoPessoalTotal)} realizado (sem orçado)`,
    },
    {
      indicador: "% OKRs definidos / atingidos",
      descricao: "Cobertura e atingimento de OKRs por pessoa/time",
      blocker: "Fonte de OKRs ainda não mapeada (ferramenta)",
      responsavel: "Diretoria",
      status: "em-definicao",
    },
    {
      indicador: "eNPS / clima organizacional",
      descricao: "Recomendação interna e clima por área",
      blocker: "Ferramenta de pesquisa interna recorrente",
      responsavel: "RH",
      status: "falta-dado",
    },
    {
      indicador: "% 1:1 realizados",
      descricao: "Frequência de 1:1 entre líder e liderado",
      blocker: "Registro padronizado de 1:1",
      responsavel: "Líderes / RH",
      status: "em-definicao",
    },
    {
      indicador: "PDI / treinamento / promoções",
      descricao: "Cobertura de PDI, horas de treinamento e movimentações",
      blocker: "Pipe de desenvolvimento de pessoas",
      responsavel: "RH",
      status: "falta-dado",
    },
    {
      indicador: "Time to hire / custo por contratação",
      descricao: "Tempo médio para fechar vaga e custo associado",
      blocker: "Pipe de recrutamento estruturado",
      responsavel: "RH",
      status: "falta-dado",
    },
    {
      indicador: "Absenteísmo",
      descricao: "Faltas, atrasos e ausências não justificadas",
      blocker: "Sistema de ponto / frequência",
      responsavel: "RH",
      status: "falta-dado",
    },
  ];

  const statusBadge = (s: Status) => {
    if (s === "parcial")
      return <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-[10px]">Parcial</Badge>;
    if (s === "em-definicao")
      return <Badge variant="outline" className="border-blue-500/50 text-blue-500 text-[10px]">Em definição</Badge>;
    return <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">Falta dado</Badge>;
  };

  const parciais = rows.filter((r) => r.status === "parcial").length;
  const faltaDado = rows.filter((r) => r.status === "falta-dado").length;
  const emDef = rows.filter((r) => r.status === "em-definicao").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-muted-foreground" />
              Fase 2 — Roadmap de indicadores
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Indicadores avançados de Pessoas que dependem de novos dados ou processos. Cada linha mostra o blocker e o responsável.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Badge variant="outline" className="border-amber-500/50 text-amber-500">{parciais} parcial</Badge>
            <Badge variant="outline" className="border-blue-500/50 text-blue-500">{emDef} em definição</Badge>
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">{faltaDado} falta dado</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase text-muted-foreground text-left">
                <th className="py-2 pr-3">Indicador</th>
                <th className="py-2 px-2">Entrega atual</th>
                <th className="py-2 px-2">Blocker</th>
                <th className="py-2 px-2">Responsável</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.indicador} className="border-b border-border/30 align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-foreground">{r.indicador}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{r.descricao}</div>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">
                    {r.valorParcial ? (
                      <span className="text-amber-500 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {r.valorParcial}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">
                    <span className="inline-flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{r.blocker}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">{r.responsavel}</td>
                  <td className="py-2.5 px-2">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
