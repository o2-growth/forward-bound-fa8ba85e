import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { AttributionCard } from "./types";

interface Props {
  salesCards: AttributionCard[]; // sales with dataAssinatura inside period
}

const fmtDate = (d?: Date | null) => (d ? format(d, 'dd/MM/yyyy') : '—');

export function ConversionCurveSection({ salesCards }: Props) {
  const { media, mediana, rows, count } = useMemo(() => {
    const valid = salesCards
      .filter(c => c.dataAssinatura && c.dataEntrada)
      .map(c => {
        const dias = Math.max(
          0,
          Math.floor((c.dataAssinatura!.getTime() - c.dataEntrada.getTime()) / 86400000),
        );
        return { card: c, dias };
      });
    const dias = valid.map(v => v.dias);
    const sum = dias.reduce((a, b) => a + b, 0);
    const media = dias.length > 0 ? sum / dias.length : 0;
    let mediana = 0;
    if (dias.length > 0) {
      const sorted = [...dias].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      mediana = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    const rows = valid.sort((a, b) => b.dias - a.dias);
    return { media, mediana, rows, count: dias.length };
  }, [salesCards]);

  const diff = mediana > 0 ? media / mediana : 0;
  const showLongTailNote = diff > 1.5;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Curva de Conversão</h3>
        <p className="text-sm text-muted-foreground">
          Quantos dias cada venda demorou da entrada até a assinatura do contrato. Baseado em {count.toLocaleString('pt-BR')} venda{count === 1 ? '' : 's'} no período.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground font-medium">Média (dias)</p>
          <p className="text-5xl font-bold tracking-tight mt-2">
            {media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground font-medium">Mediana (dias)</p>
          <p className="text-5xl font-bold tracking-tight mt-2">
            {mediana.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
          </p>
        </Card>
      </div>

      {showLongTailNote && (
        <p className="text-xs text-muted-foreground italic">
          Diferença grande entre média e mediana indica que poucas vendas levam muito mais tempo que a maioria (cauda longa).
        </p>
      )}

      <Card>
        <div className="p-4 border-b">
          <h4 className="font-semibold">Detalhe por venda</h4>
          <p className="text-xs text-muted-foreground">Ordenado por dias até fechar (maior primeiro).</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Contrato assinado</TableHead>
              <TableHead className="text-right">Dias até fechar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem vendas no período.</TableCell></TableRow>
            ) : (
              rows.map(({ card, dias }) => (
                <TableRow key={card.id}>
                  <TableCell>{card.empresa || card.titulo}</TableCell>
                  <TableCell>{fmtDate(card.dataEntrada)}</TableCell>
                  <TableCell>{fmtDate(card.dataAssinatura)}</TableCell>
                  <TableCell className="text-right font-medium">{dias.toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
