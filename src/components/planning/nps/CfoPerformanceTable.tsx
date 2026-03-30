import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { CfoPerformance } from '@/hooks/useNpsData';
import { PipefyCardLink } from './PipefyCardLink';
import { ChevronRight } from 'lucide-react';

function getNpsColor(nps: number) {
  if (nps >= 75) return 'text-green-600 dark:text-green-400';
  if (nps >= 50) return 'text-green-500 dark:text-green-500';
  if (nps > 0) return 'text-amber-600 dark:text-amber-400';
  if (nps === 0) return 'text-muted-foreground';
  return 'text-red-600 dark:text-red-400';
}

function getSentimentBadge(sentiment: string) {
  if (sentiment === 'Positivo') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">Promotor</Badge>;
  if (sentiment === 'Negativo') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs">Detrator</Badge>;
  return <Badge variant="outline" className="text-xs">Neutro</Badge>;
}

interface Props {
  data: CfoPerformance[];
  npsPipeId?: string;
}

export function CfoPerformanceTable({ data, npsPipeId = '' }: Props) {
  const [selectedCfo, setSelectedCfo] = useState<CfoPerformance | null>(null);

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-6 h-0.5 bg-primary rounded" />
        Métricas por CFO
      </h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance por CFO — clique para ver respondentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CFO</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
                <TableHead className="text-center">Taxa Resposta</TableHead>
                <TableHead className="text-center">NPS</TableHead>
                <TableHead className="text-center">CSAT</TableHead>
                <TableHead className="text-center">Sean Ellis</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(cfo => (
                <TableRow
                  key={cfo.name}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCfo(cfo)}
                >
                  <TableCell className="font-medium text-sm">{cfo.name}</TableCell>
                  <TableCell className="text-center">{cfo.enviados}</TableCell>
                  <TableCell className="text-center">{cfo.respostas}</TableCell>
                  <TableCell className="text-center">{cfo.taxaResposta}%</TableCell>
                  <TableCell className={`text-center font-semibold ${getNpsColor(cfo.nps)}`}>{cfo.nps}</TableCell>
                  <TableCell className="text-center">{cfo.csat}%</TableCell>
                  <TableCell className="text-center">{cfo.seanEllis !== null ? `${cfo.seanEllis}%` : 'N/A'}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedCfo} onOpenChange={() => setSelectedCfo(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedCfo && (
            <>
              <SheetHeader>
                <SheetTitle>Respondentes NPS — {selectedCfo.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">NPS</p>
                    <p className={`text-lg font-bold ${getNpsColor(selectedCfo.nps)}`}>{selectedCfo.nps}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">CSAT</p>
                    <p className="text-lg font-bold text-foreground">{selectedCfo.csat}%</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Respostas</p>
                    <p className="text-lg font-bold text-foreground">{selectedCfo.respostas}</p>
                  </div>
                </div>
                {selectedCfo.cards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta registrada</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCfo.cards.map((card, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{card.titulo || 'Sem título'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>NPS: <strong>{card.nota}</strong></span>
                            {card.csat !== null && <span>CSAT: {card.csat}/5</span>}
                            {card.email && <span className="truncate max-w-[140px]">{card.email}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {getSentimentBadge(card.sentiment)}
                          {npsPipeId && <PipefyCardLink pipeId={npsPipeId} cardId={card.cardId} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
