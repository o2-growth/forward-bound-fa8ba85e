import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown, Info, CheckCircle2, Wallet, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export interface OperacaoKpisData {
  tratativasResolvidas: Array<{ titulo: string; cfo: string; motivo: string; decisao: string; valorIsentado: number; data?: Date | null }>;
  tratativasResolvidasCount: number;
  isentamentos: Array<{ titulo: string; cfo: string; motivoChurn: string | null; valor: number; data?: Date | null }>;
  valorIsentadoTotal: number;
  churnsOxy: Array<{ titulo: string; cfo: string; motivo: string; mrr: number; data?: Date | null }>;
  churnsOxyCount: number;
  tempoTratativaChurn: Array<{ titulo: string; cfo: string; diasAteChurn: number; motivo: string; status?: 'churn' | 'ongoing'; data?: Date | null }>;
  tempoMedioTratativaChurn: number;
  tempoMedianoTratativaChurn: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface Props { operacao?: OperacaoKpisData; dateRange?: { from: Date; to: Date } }

export function OperacaoKpisStrip({ operacao, dateRange }: Props) {
  const [opDialog, setOpDialog] = useState<'resolvidas' | 'isentado' | 'oxy' | 'tempo' | null>(null);
  if (!operacao) return null;

  const inRange = (d?: Date | null): boolean => {
    if (!dateRange) return true;
    if (!d) return false;
    return d >= dateRange.from && d <= dateRange.to;
  };
  const periodLabel = dateRange ? 'no período selecionado' : 'total';

  const resolvidasFiltered = operacao.tratativasResolvidas.filter(t => inRange(t.data));
  const isentamentosFiltered = operacao.isentamentos.filter(i => inRange(i.data));
  const churnsOxyFiltered = operacao.churnsOxy.filter(c => inRange(c.data));
  const valorIsentadoFiltered = isentamentosFiltered.reduce((s, i) => s + i.valor, 0);
  const mrrOxyFiltered = churnsOxyFiltered.reduce((s, c) => s + c.mrr, 0);

  // Tempo levantar a mão: universo restrito a tratativas iniciadas no período
  const tempoFiltered = operacao.tempoTratativaChurn.filter(t => inRange(t.data));
  const tempoChurnList = tempoFiltered.filter(t => t.status === 'churn');
  const tempoOngoingCount = tempoFiltered.filter(t => t.status === 'ongoing').length;
  const tempoMedio = tempoChurnList.length
    ? Math.round(tempoChurnList.reduce((s, t) => s + t.diasAteChurn, 0) / tempoChurnList.length)
    : 0;
  const tempoMediano = tempoChurnList.length
    ? (() => {
        const sorted = [...tempoChurnList].sort((a, b) => a.diasAteChurn - b.diasAteChurn);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1].diasAteChurn + sorted[mid].diasAteChurn) / 2)
          : sorted[mid].diasAteChurn;
      })()
    : 0;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition" onClick={() => setOpDialog('resolvidas')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Tratativas resolvidas com sucesso</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 ml-auto opacity-60 cursor-help" onClick={(e) => e.stopPropagation()} />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">De onde vem:</p>
                  <p>Pipefy → pipe <strong>Tratativas</strong> → tabela <code>pipefy_moviment_tratativas</code></p>
                  <p className="mt-2 font-semibold">Como conta:</p>
                  <p>Cards cujo campo <code>Decisão Final</code> contém "sucesso", "retomada", "resolvido" ou "implementada com sucesso", OU campo <code>Solucao Implementada com Sucesso = Sim</code>.</p>
                  <p className="mt-2 text-muted-foreground">Clique para ver a lista detalhada.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold">{resolvidasFiltered.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Decisão Final = sucesso/retomada · {periodLabel}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition" onClick={() => setOpDialog('isentado')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Valor isentado (Atendimento O2)</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 ml-auto opacity-60 cursor-help" onClick={(e) => e.stopPropagation()} />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">De onde vem:</p>
                  <p>Pipefy → pipe <strong>Tratativas</strong> → campo <code>Valor Isentado finalizacao</code> (fallbacks: <code>Valor Isentado</code>, <code>Valor isentado</code>).</p>
                  <p className="mt-2 font-semibold">Como soma:</p>
                  <p>Considera <strong>apenas churns do período</strong> cujo motivo é "Atendimento O2" e soma o <code>Valor Isentado</code> da tratativa associada. Subconjunto dos churns do dossiê.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(valorIsentadoFiltered)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{isentamentosFiltered.length} churns Atendimento O2 · {periodLabel}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition" onClick={() => setOpDialog('oxy')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Churns com problema na Oxy</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 ml-auto opacity-60 cursor-help" onClick={(e) => e.stopPropagation()} />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">De onde vem:</p>
                  <p>Pipefy → pipe <strong>Central de Projetos</strong> → campo <code>Problemas com a Oxy</code>.</p>
                  <p className="mt-2 font-semibold">Como conta:</p>
                  <p>Clientes em fase Churn / Desistência / Arquivado cujo card tem <code>Problemas com a Oxy</code> preenchido, OU cujo motivo principal/cancelamento contém a palavra "oxy".</p>
                  <p className="mt-2 text-muted-foreground">MRR perdido = soma do MRR desses clientes. Clique para ver a lista.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold">{churnsOxyFiltered.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">MRR perdido: {formatCurrency(mrrOxyFiltered)} · {periodLabel}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition" onClick={() => setOpDialog('tempo')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Tempo levantar a mão → churn</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 ml-auto opacity-60 cursor-help" onClick={(e) => e.stopPropagation()} />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">De onde vem:</p>
                  <p>Pipefy → <strong>Tratativas</strong> (campo <code>Entrada</code> da 1ª tratativa do cliente) cruzado com <strong>Central de Projetos</strong> (<code>Data encerramento</code> / <code>Saída</code> do churn).</p>
                  <p className="mt-2 font-semibold">Universo:</p>
                  <p>Apenas tratativas <strong>iniciadas no período selecionado</strong>. Se o cliente já virou churn → conta na média/mediana. Se ainda não virou → aparece como "em andamento" (não entra na média).</p>
                  <p className="mt-2 text-muted-foreground">Clique para ver a lista completa.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-2xl font-bold">{tempoMedio} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              mediana {tempoMediano}d · {tempoChurnList.length} churns · {tempoOngoingCount} em andamento · {periodLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={opDialog === 'resolvidas'} onOpenChange={(o) => !o && setOpDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Tratativas resolvidas com sucesso</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>CFO</TableHead><TableHead>Motivo</TableHead><TableHead>Decisão</TableHead><TableHead className="text-right">Isentado</TableHead></TableRow></TableHeader>
            <TableBody>
              {resolvidasFiltered.map((t, i) => (
                <TableRow key={i}><TableCell>{t.titulo}</TableCell><TableCell>{t.cfo}</TableCell><TableCell>{t.motivo}</TableCell><TableCell>{t.decisao}</TableCell><TableCell className="text-right">{t.valorIsentado > 0 ? formatCurrency(t.valorIsentado) : '—'}</TableCell></TableRow>
              ))}
              {resolvidasFiltered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma tratativa resolvida com sucesso encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={opDialog === 'isentado'} onOpenChange={(o) => !o && setOpDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Valor isentado por tratativa</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>CFO</TableHead><TableHead>Motivo Churn</TableHead><TableHead className="text-right">Valor isentado</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...isentamentosFiltered].sort((a, b) => b.valor - a.valor).map((i, idx) => (
                <TableRow key={idx}><TableCell>{i.titulo}</TableCell><TableCell>{i.cfo}</TableCell><TableCell>{i.motivoChurn || '—'}</TableCell><TableCell className="text-right">{formatCurrency(i.valor)}</TableCell></TableRow>
              ))}
              {isentamentosFiltered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhuma tratativa com valor isentado registrado no Pipefy.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={opDialog === 'tempo'} onOpenChange={(o) => !o && setOpDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Tempo entre levantar a mão e churn</DialogTitle></DialogHeader>
          <div className="text-xs text-muted-foreground mb-3">
            Média: <strong className="text-foreground">{operacao.tempoMedioTratativaChurn} dias</strong> · Mediana: <strong className="text-foreground">{operacao.tempoMedianoTratativaChurn} dias</strong> · {operacao.tempoTratativaChurn.filter(t => t.status === 'churn').length} churns · {operacao.tempoTratativaChurn.filter(t => t.status === 'ongoing').length} em andamento
            <p className="mt-1 text-[10px]">Médias calculadas apenas sobre clientes que já viraram churn.</p>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>CFO</TableHead><TableHead>Status</TableHead><TableHead>Motivo</TableHead><TableHead className="text-right">Dias</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...operacao.tempoTratativaChurn]
                .sort((a, b) => {
                  // churns primeiro, depois ongoing; dentro de cada grupo desc por dias
                  if (a.status !== b.status) return a.status === 'churn' ? -1 : 1;
                  return b.diasAteChurn - a.diasAteChurn;
                })
                .map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.titulo}</TableCell>
                    <TableCell>{t.cfo}</TableCell>
                    <TableCell>
                      {t.status === 'churn' ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 text-[10px] font-medium">Churn</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">Em andamento</span>
                      )}
                    </TableCell>
                    <TableCell>{t.motivo}</TableCell>
                    <TableCell className="text-right">{t.diasAteChurn}d</TableCell>
                  </TableRow>
                ))}
              {operacao.tempoTratativaChurn.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma tratativa registrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={opDialog === 'oxy'} onOpenChange={(o) => !o && setOpDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Churns com problema na Oxy</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>CFO</TableHead><TableHead>Motivo</TableHead><TableHead className="text-right">MRR</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...churnsOxyFiltered].sort((a, b) => b.mrr - a.mrr).map((c, i) => (
                <TableRow key={i}><TableCell>{c.titulo}</TableCell><TableCell>{c.cfo}</TableCell><TableCell>{c.motivo}</TableCell><TableCell className="text-right">{formatCurrency(c.mrr)}</TableCell></TableRow>
              ))}
              {churnsOxyFiltered.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum churn por problema na Oxy.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
