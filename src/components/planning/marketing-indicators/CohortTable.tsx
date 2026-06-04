import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AttributionCard } from "./types";

interface Props {
  cards: AttributionCard[]; // ALL attribution cards in period (will filter sales internally)
  cohortType: 'entrada' | 'assinatura';
  investmentByMonth: Map<string, number>; // 'yyyy-MM' -> investment
  title: string;
  description?: string;
}

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtDate = (d?: Date | null) => (d ? format(d, 'dd/MM/yyyy') : '—');

interface SafraGroup {
  key: string;            // yyyy-MM
  label: string;          // "Fevereiro 2024"
  vendas: AttributionCard[];
  investimento: number;
  mrrTotal: number;
  setupTotal: number;
  pontualTotal: number;
  educacaoTotal: number;
  faturamento: number;
  cac: number;
}

export function CohortTable({ cards, cohortType, investmentByMonth, title, description }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo<SafraGroup[]>(() => {
    // Vendas = qualquer card com dataAssinatura preenchida
    const sales = cards.filter(c => c.dataAssinatura instanceof Date);
    const map = new Map<string, AttributionCard[]>();

    for (const c of sales) {
      const refDate = cohortType === 'entrada' ? c.dataEntrada : c.dataAssinatura!;
      if (!refDate) continue;
      const key = format(refDate, 'yyyy-MM');
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }

    const result: SafraGroup[] = [];
    for (const [key, vendas] of map.entries()) {
      // Sort vendas inside safra
      vendas.sort((a, b) => a.dataEntrada.getTime() - b.dataEntrada.getTime());

      // Investimento da safra
      let investimento = 0;
      if (cohortType === 'entrada') {
        investimento = investmentByMonth.get(key) || 0;
      } else {
        // Assinatura: somar invest dos meses de ENTRADA distintos das vendas dessa safra
        const monthsEntrada = new Set<string>();
        for (const v of vendas) {
          monthsEntrada.add(format(v.dataEntrada, 'yyyy-MM'));
        }
        for (const m of monthsEntrada) {
          investimento += investmentByMonth.get(m) || 0;
        }
      }

      const mrrTotal = vendas.reduce((s, v) => s + (v.valorMRR || 0), 0);
      const setupTotal = vendas.reduce((s, v) => s + (v.valorSetup || 0), 0);
      const pontualTotal = vendas.reduce((s, v) => s + (v.valorPontual || 0), 0);
      const educacaoTotal = vendas.reduce((s, v) => s + (v.valorEducacao || 0), 0);
      const faturamento = mrrTotal + setupTotal + pontualTotal + educacaoTotal;
      const cac = vendas.length > 0 ? investimento / vendas.length : 0;

      // Label "Fevereiro 2024" em pt-BR
      const [y, m] = key.split('-').map(Number);
      const refDate = new Date(y, m - 1, 1);
      const monthName = format(refDate, 'MMMM yyyy', { locale: ptBR });
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      result.push({
        key, label, vendas, investimento,
        mrrTotal, setupTotal, pontualTotal, educacaoTotal,
        faturamento, cac,
      });
    }

    // Safras desc (mais recente primeiro)
    result.sort((a, b) => b.key.localeCompare(a.key));
    return result;
  }, [cards, cohortType, investmentByMonth]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Column layout differs: cohort "assinatura" pushes "Criado em" to the end.
  const isAssinatura = cohortType === 'assinatura';

  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Safra</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">MRR Total</TableHead>
              <TableHead className="text-right">Setup Total</TableHead>
              <TableHead className="text-right">Pontual Total</TableHead>
              <TableHead className="text-right">Educação Total</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">CAC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Sem vendas no período.</TableCell></TableRow>
            ) : groups.map(g => {
              const isOpen = expanded.has(g.key);
              return (
                <>
                  <TableRow key={g.key} className="bg-muted/30 font-medium">
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggle(g.key)}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>{g.label}</TableCell>
                    <TableCell className="text-right">{g.vendas.length}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.investimento)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.mrrTotal)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.setupTotal)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.pontualTotal)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.educacaoTotal)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.faturamento)}</TableCell>
                    <TableCell className="text-right">{formatBRL(g.cac)}</TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${g.key}-detail`}>
                      <TableCell colSpan={10} className="p-0">
                        <div className="bg-background p-3 border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                {!isAssinatura && <TableHead>Criado em</TableHead>}
                                <TableHead>Fonte</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-right">MRR</TableHead>
                                <TableHead className="text-right">Setup</TableHead>
                                <TableHead className="text-right">Pontual</TableHead>
                                <TableHead className="text-right">Educação</TableHead>
                                <TableHead>Contrato assinado</TableHead>
                                {isAssinatura && <TableHead>Criado em</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.vendas.map(v => {
                                const fonte = v.fonte || v.origemLead || v.tipoOrigem || '—';
                                return (
                                  <TableRow key={v.id}>
                                    <TableCell>{v.empresa || v.titulo}</TableCell>
                                    {!isAssinatura && <TableCell>{fmtDate(v.dataEntrada)}</TableCell>}
                                    <TableCell className="text-xs">{fonte}</TableCell>
                                    <TableCell className="text-xs">{v.produto || v.bu}</TableCell>
                                    <TableCell className="text-right">{formatBRL(v.valorMRR || 0)}</TableCell>
                                    <TableCell className="text-right">{formatBRL(v.valorSetup || 0)}</TableCell>
                                    <TableCell className="text-right">{formatBRL(v.valorPontual || 0)}</TableCell>
                                    <TableCell className="text-right">{formatBRL(v.valorEducacao || 0)}</TableCell>
                                    <TableCell>{fmtDate(v.dataAssinatura)}</TableCell>
                                    {isAssinatura && <TableCell>{fmtDate(v.dataEntrada)}</TableCell>}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
