import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { getChannelGroup, getChannelLabel, type ChannelGroup } from "@/lib/marketingChannelGroup";
import type { AttributionCard } from "./types";

interface Props {
  leadsCards: AttributionCard[]; // cards considered "leads" (entry)
  salesCards: AttributionCard[]; // cards considered "sales" (Contrato assinado in period)
  totalInvestment: number;       // Meta+Google in the filtered period
}

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const formatPct = (n: number) =>
  `${(n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

interface FonteRow {
  label: string;
  group: ChannelGroup;
  leads: number;
  sales: number;
  bus: Set<string>;
}

export function OnlineOfflineSection({ leadsCards, salesCards, totalInvestment }: Props) {
  const { onlineLeads, offlineLeads, onlineSales, offlineSales, perFonte, unclassified } = useMemo(() => {
    const counts = { onlineLeads: 0, offlineLeads: 0, onlineSales: 0, offlineSales: 0 };
    const perFonte = new Map<string, FonteRow>();

    const bump = (card: AttributionCard, type: 'leads' | 'sales') => {
      const group = getChannelGroup(card.fonte, card.origemLead, card.tipoOrigem, card.campanha);
      const label = getChannelLabel(card.fonte, card.origemLead, card.tipoOrigem);
      const key = `${group}__${label.toLowerCase()}`;
      const entry = perFonte.get(key) || { label, group, leads: 0, sales: 0, bus: new Set<string>() };
      entry[type] += 1;
      if (card.bu) entry.bus.add(card.bu);
      perFonte.set(key, entry);
      if (group === 'online') {
        if (type === 'leads') counts.onlineLeads++; else counts.onlineSales++;
      } else if (group === 'offline') {
        if (type === 'leads') counts.offlineLeads++; else counts.offlineSales++;
      }
    };

    for (const c of leadsCards) bump(c, 'leads');
    for (const c of salesCards) bump(c, 'sales');

    const all = Array.from(perFonte.values()).filter(r => r.leads > 0 || r.sales > 0);
    const classified = all.filter(r => r.group !== 'desconhecido').sort((a, b) => b.leads - a.leads);
    const unclassified = all.filter(r => r.group === 'desconhecido').sort((a, b) => b.leads - a.leads);

    return {
      ...counts,
      perFonte: classified,
      unclassified,
    };
  }, [leadsCards, salesCards]);

  const onlineConv = onlineLeads > 0 ? onlineSales / onlineLeads : 0;
  const offlineConv = offlineLeads > 0 ? offlineSales / offlineLeads : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Conversão Online vs Offline</h3>
        <p className="text-sm text-muted-foreground">
          Taxa de conversão Leads → Vendas, agrupada por canal. Fontes vêm direto dos campos
          <em> Fonte / Origem do lead / Tipo de Origem do lead </em>
          do Pipefy, classificadas em <code>src/lib/marketingChannelGroup.ts</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Online</h4>
            <Badge variant="secondary">Mídia paga + digital</Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span className="font-medium">{onlineLeads.toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vendas</span><span className="font-medium">{onlineSales.toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Conversão</span><span className="font-semibold text-primary">{formatPct(onlineConv)}</span></div>
            <div className="flex justify-between pt-2 border-t mt-2"><span className="text-muted-foreground">Investimento</span><span className="font-medium">{formatBRL(totalInvestment)}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Offline</h4>
            <Badge variant="secondary">Indicação + prospecção</Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span className="font-medium">{offlineLeads.toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vendas</span><span className="font-medium">{offlineSales.toLocaleString('pt-BR')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Conversão</span><span className="font-semibold text-primary">{formatPct(offlineConv)}</span></div>
            <div className="flex justify-between pt-2 border-t mt-2"><span className="text-muted-foreground">Investimento</span><span className="font-medium">{formatBRL(0)}</span></div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b">
          <h4 className="font-semibold">Detalhe por fonte</h4>
          <p className="text-xs text-muted-foreground">Ordenado por leads decrescente. Fontes com pelo menos 1 lead ou 1 venda.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fonte</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>BU(s)</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Taxa de Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perFonte.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem dados no período.</TableCell></TableRow>
            ) : (
              perFonte.map(r => {
                const conv = r.leads > 0 ? r.sales / r.leads : 0;
                return (
                  <TableRow key={`${r.group}-${r.label}`}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell>
                      <Badge variant={r.group === 'online' ? 'default' : 'secondary'}>
                        {r.group}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{Array.from(r.bus).join(', ') || '—'}</TableCell>
                    <TableCell className="text-right">{r.leads.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{r.sales.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right font-medium">{formatPct(conv)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {unclassified.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <div className="p-4 border-b border-yellow-500/40 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold">Fontes sem classificação ({unclassified.length})</h4>
              <p className="text-xs text-muted-foreground">
                Estas fontes vieram do Pipefy mas não estão mapeadas em <code>src/lib/marketingChannelGroup.ts</code>.
                Enquanto estiverem aqui, NÃO entram nos cards "Online" e "Offline" acima. Adicione cada uma à lista
                <code> ONLINE_FONTES </code> ou <code>OFFLINE_FONTES</code>.
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte (valor bruto)</TableHead>
                <TableHead>BU(s)</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unclassified.map(r => (
                <TableRow key={`unk-${r.label}`}>
                  <TableCell className="font-mono text-xs">{r.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{Array.from(r.bus).join(', ') || '—'}</TableCell>
                  <TableCell className="text-right">{r.leads.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{r.sales.toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
