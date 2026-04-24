import { useState } from 'react';
import { NpsKpis, CfoPerformance } from '@/hooks/useNpsData';
import { Users, MessageSquare, TrendingUp, Target, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface Props {
  data: NpsKpis;
  cfoPerformance?: CfoPerformance[];
}

export function NpsKpiCards({ data, cfoPerformance = [] }: Props) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const kpis = [
    { icon: Users, label: 'Clientes Pesquisados', value: data.clientesPesquisados, key: 'pesquisados', tooltip: 'Total de clientes elegíveis (Onboarding ou Em Operação Recorrente) que receberam a pesquisa NPS no período. Fonte: Pipefy — Pesquisa de Satisfação NPS' },
    { icon: MessageSquare, label: 'Respostas', value: data.respostas, key: 'respostas', tooltip: 'Clientes que responderam à pesquisa com nota NPS registrada. Deduplicado por cliente (última resposta). Fonte: Pipefy — Pesquisa de Satisfação NPS' },
    { icon: TrendingUp, label: 'Taxa Resposta', value: `${data.taxaResposta}%`, key: 'taxa', tooltip: 'Taxa = Respostas / Pesquisados × 100. Considera apenas clientes > 3 meses. Fonte: Pipefy — Pesquisa de Satisfação NPS' },
    { icon: Target, label: 'CFOs Ativos', value: data.cfosAtivos, key: 'cfos', tooltip: 'CFOs com pelo menos 1 cliente respondente na pesquisa. Cruzamento: Central de Projetos (CFO) + Pesquisa NPS (respostas). Fonte: Pipefy' },
  ];

  function renderDetail(key: string) {
    switch (key) {
      case 'pesquisados':
        return (
          <div className="text-sm text-muted-foreground space-y-1 p-3">
            <p><strong>{data.clientesPesquisados}</strong> clientes elegíveis para a pesquisa NPS (ativos em Onboarding ou Em Operação Recorrente).</p>
            {cfoPerformance.length > 0 && (
              <div className="mt-2 max-h-[250px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">CFO</TableHead>
                      <TableHead className="text-xs text-right">Enviados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfoPerformance.map(c => (
                      <TableRow key={c.name}>
                        <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{c.enviados}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell className="text-xs py-1.5">Total</TableCell>
                      <TableCell className="text-xs text-right py-1.5">{cfoPerformance.reduce((s, c) => s + c.enviados, 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      case 'respostas':
        return (
          <div className="text-sm space-y-1 p-3">
            <p className="text-muted-foreground"><strong>{data.respostas}</strong> respondentes com nota NPS registrada.</p>
            {cfoPerformance.length > 0 && (
              <div className="mt-2 max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">CFO</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs text-right">NPS</TableHead>
                      <TableHead className="text-xs text-right">CSAT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfoPerformance.flatMap(c =>
                      c.cards.map(card => (
                        <TableRow key={card.cardId}>
                          <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                          <TableCell className="text-xs py-1.5 max-w-[150px] truncate">{card.titulo}</TableCell>
                          <TableCell className="text-xs text-right py-1.5">
                            <Badge variant="outline" className={`text-[10px] ${
                              card.nota >= 9 ? 'border-green-500 text-green-700 dark:text-green-400' :
                              card.nota >= 7 ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                              'border-red-500 text-red-700 dark:text-red-400'
                            }`}>{card.nota}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right py-1.5">
                            {card.csat !== null ? card.csat : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      case 'taxa':
        return (
          <div className="text-sm space-y-1 p-3">
            <p className="text-muted-foreground">Taxa de resposta: <strong>{data.respostas}</strong> respostas / <strong>{data.clientesPesquisados}</strong> pesquisados = <strong>{data.taxaResposta}%</strong></p>
            {cfoPerformance.length > 0 && (
              <div className="mt-2 max-h-[250px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">CFO</TableHead>
                      <TableHead className="text-xs text-right">Enviados</TableHead>
                      <TableHead className="text-xs text-right">Respostas</TableHead>
                      <TableHead className="text-xs text-right">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfoPerformance.map(c => (
                      <TableRow key={c.name}>
                        <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{c.enviados}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{c.respostas}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">
                          <Badge variant="outline" className={`text-[10px] ${
                            c.taxaResposta >= 50 ? 'border-green-500 text-green-700 dark:text-green-400' :
                            c.taxaResposta >= 30 ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                            'border-red-500 text-red-700 dark:text-red-400'
                          }`}>{c.taxaResposta}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      case 'cfos':
        return (
          <div className="text-sm space-y-1 p-3">
            <p className="text-muted-foreground"><strong>{data.cfosAtivos}</strong> CFOs ativos participando da pesquisa NPS.</p>
            {cfoPerformance.length > 0 && (
              <div className="mt-2 max-h-[250px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">CFO</TableHead>
                      <TableHead className="text-xs text-right">Clientes</TableHead>
                      <TableHead className="text-xs text-right">NPS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfoPerformance.map(c => (
                      <TableRow key={c.name}>
                        <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">{c.enviados}</TableCell>
                        <TableCell className="text-xs text-right py-1.5">
                          <Badge variant="outline" className={`text-[10px] ${
                            c.nps >= 50 ? 'border-green-500 text-green-700 dark:text-green-400' :
                            c.nps >= 0 ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                            'border-red-500 text-red-700 dark:text-red-400'
                          }`}>{c.nps}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <TooltipProvider>
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isExpanded = expandedMetric === kpi.key;
          return (
            <div
              key={kpi.label}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedMetric(isExpanded ? null : kpi.key)}
            >
              <div className="rounded-full bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {kpi.label}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline ml-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>{kpi.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
              <div className="shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          );
        })}
      </div>
      {expandedMetric && (
        <div className="rounded-lg border bg-card shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {renderDetail(expandedMetric)}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
