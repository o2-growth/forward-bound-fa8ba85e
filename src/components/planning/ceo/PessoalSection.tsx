import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import { useOxyFinance } from "@/hooks/useOxyFinance";
import { useHrData } from "@/hooks/useHrData";
import { useOperationsData } from "@/hooks/useOperationsData";
import { headcountByBu, type PessoaBu } from "@/components/planning/pessoas/helpers";
import { fmt, fmtFull, fmtInt, sumMonths, MetricCard, AiNote, AguardandoFonte, type MetricSource } from "./ceoShared";

interface Props { dateRange: { from: Date; to: Date }; }

const SRC: MetricSource = {
  origem: "Receita por BU (useOxyFinance / DRE Oxy) ÷ headcount por setor (useHrData)",
  periodo: "Receita soma os meses do período; headcount é snapshot atual",
  calculo: "Receita do setor ÷ nº de pessoas do setor.",
};

export function PessoalSection({ dateRange }: Props) {
  const { from, to } = dateRange;
  const oxy = useOxyFinance();
  const hr = useHrData({ startDate: from, endDate: to });
  const ops = useOperationsData();

  const isLoading = oxy.isLoading || hr.isLoading;

  const setores = useMemo(() => {
    const headByBu = new Map<PessoaBu, number>();
    for (const h of headcountByBu(hr.rawPessoas ?? [])) headByBu.set(h.bu, h.count);

    const rows = [
      { setor: "CaaS", receita: sumMonths(oxy.caasByMonth, from, to), pessoas: headByBu.get("CaaS") ?? 0 },
      { setor: "SaaS", receita: sumMonths(oxy.saasByMonth, from, to), pessoas: headByBu.get("SaaS") ?? 0 },
      { setor: "TAX", receita: sumMonths(oxy.dreByBU?.o2_tax, from, to), pessoas: headByBu.get("TAX") ?? 0 },
      { setor: "Expansão", receita: sumMonths(oxy.expansaoByMonth, from, to), pessoas: headByBu.get("Expansão") ?? 0 },
    ].map((r) => ({ ...r, receitaPorPessoa: r.pessoas > 0 ? r.receita / r.pessoas : null }));

    const totalReceita = rows.reduce((s, r) => s + r.receita, 0);
    const totalPessoas = hr.headcountTotal ?? 0;
    return { rows, totalReceita, totalPessoas };
  }, [oxy.caasByMonth, oxy.saasByMonth, oxy.dreByBU, oxy.expansaoByMonth, hr.rawPessoas, hr.headcountTotal, from, to]);

  const mrrTotal = ops.data?.kpis?.mrrTotal ?? null;
  const mrrPorPessoa = mrrTotal != null && setores.totalPessoas > 0 ? mrrTotal / setores.totalPessoas : null;
  const receitaPorPessoaGeral = setores.totalPessoas > 0 ? setores.totalReceita / setores.totalPessoas : null;

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-muted-foreground" />Receita e MRR por pessoa</CardTitle>
          <p className="text-xs text-muted-foreground">Eficiência da operação — receita e MRR gerados por colaborador.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Receita / pessoa" value={fmt(receitaPorPessoaGeral)} large source={SRC} />
            <MetricCard label="MRR / pessoa" value={fmt(mrrPorPessoa)} source={SRC} />
            <MetricCard label="Headcount total" value={fmtInt(setores.totalPessoas)} source={SRC} />
            <MetricCard label="Receita do período" value={fmt(setores.totalReceita)} source={SRC} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">Receita / pessoa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.rows.map((r) => (
                  <TableRow key={r.setor}>
                    <TableCell className="font-medium">{r.setor}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtFull(r.receita)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.pessoas)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(r.receitaPorPessoa)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <AiNote />
        </CardContent>
      </Card>

      <AguardandoFonte
        titulo="Lucro Bruto e EBITDA por pessoa / por setor"
        descricao="Requer o DRE segregado por BU (custo variável e custos por setor), que ainda não é exposto pelo Oxy Finance."
        itens={[
          "Lucro Bruto por pessoa e por setor",
          "EBITDA por pessoa e por setor",
          "Previsto x realizado de receita por pessoa (precisa de meta de headcount)",
          "Entradas e saídas de pessoas projetadas para o mês",
        ]}
      />
    </div>
  );
}
