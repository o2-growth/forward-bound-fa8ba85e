import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown } from "lucide-react";
import { AttributionCard } from "./types";

function isMetaCampaignId(value: string): boolean {
  return /^\d{10,}$/.test(value.trim());
}

function inferTipoOrigem(card: AttributionCard): string {
  const raw = card.tipoOrigem?.trim();
  if (raw) return raw;

  const fonte = (card.fonte || '').toLowerCase().trim();
  const origem = (card.origemLead || '').toLowerCase();

  if (fonte.includes('evento') || origem.includes('evento') || fonte.includes('g4') || origem.includes('g4')) return 'Eventos';
  if (card.fbclid || (card.campanha && isMetaCampaignId(card.campanha))) return 'Site/Redes Sociais';
  if (['ig', 'fb'].includes(fonte) || fonte.includes('facebook') || fonte.includes('instagram') || fonte.includes('meta')) return 'Site/Redes Sociais';
  if (card.gclid || fonte === 'googleads' || fonte.includes('google')) return 'Site/Redes Sociais';
  if (origem.includes('indica')) return 'Indicação Cliente';
  if (fonte.includes('site') || fonte.includes('organic') || fonte.includes('orgânico') || fonte.includes('organico')) return 'Site/Redes Sociais';

  return 'Outros';
}

const ORIGEM_MAP: Record<string, string> = {
  fb: 'Facebook',
  facebook: 'Facebook',
  'facebook.com': 'Facebook',
  google: 'Google Ads',
  googleads: 'Google Ads',
  'google ads': 'Google Ads',
  ig: 'Instagram',
  instagram: 'Instagram',
  'instagram.com': 'Instagram',
  meta: 'Meta Ads',
  'meta ads': 'Meta Ads',
  site: 'Site',
  organic: 'Orgânico',
  'orgânico': 'Orgânico',
  organico: 'Orgânico',
  bing: 'Bing',
  googleleads: 'Google Ads',
};

function normalizeOrigemLead(raw: string): string {
  if (!raw || raw.includes('{{')) return '(Sem origem)';
  // Take only the FIRST segment before any comma, ?, or &
  const base = raw.split(/[,?&]/)[0].trim();
  if (!base) return '(Sem origem)';
  if (/^\d{10,}$/.test(base)) return 'Meta Ads';
  const key = base.toLowerCase().replace(/\.com\/?$/, '').replace(/\/$/, '');
  return ORIGEM_MAP[key] || (base.charAt(0).toUpperCase() + base.slice(1));
}

function inferOrigemLead(card: AttributionCard): string {
  const raw = card.origemLead?.trim();
  if (raw) return normalizeOrigemLead(raw);

  const fonte = (card.fonte || '').toLowerCase().trim();
  if (fonte && ORIGEM_MAP[fonte]) return ORIGEM_MAP[fonte];
  if (card.campanha && isMetaCampaignId(card.campanha)) return 'Meta Ads';
  if (card.fbclid) return 'Facebook';
  if (card.gclid) return 'Google Ads';
  if (fonte) return fonte.charAt(0).toUpperCase() + fonte.slice(1);

  return '(Sem origem)';
}

const PHASE_FUNNEL_MAP: Record<string, string> = {
  'Novos Leads': 'leads',
  'Start form': 'leads',
  'MQLs': 'mqls',
  'MQL': 'mqls',
  'Tentativas de contato': 'mqls',
  'Material ISCA': 'mqls',
  'Reunião agendada / Qualificado': 'rms',
  'Reunião Realizada': 'rrs',
  '1° Reunião Realizada - Apresentação': 'rrs',
  '1° Reunião Realizada': 'rrs',
  'Proposta enviada / Follow Up': 'propostas',
  'Enviar para assinatura': 'propostas',
  'Contrato assinado': 'vendas',
};

const FUNNEL_ORDER = ['leads', 'mqls', 'rms', 'rrs', 'propostas', 'vendas'];

function getCumulativeStages(stage: string): string[] {
  const idx = FUNNEL_ORDER.indexOf(stage);
  return FUNNEL_ORDER.slice(0, idx + 1);
}

interface OrigemRow {
  tipoOrigem: string;
  leads: number;
  mqls: number;
  rms: number;
  rrs: number;
  propostas: number;
  vendas: number;
}

interface OrigemGroup {
  row: OrigemRow;
  subRows: OrigemRow[];
}

interface ConversionsByChannelChartProps {
  cards: AttributionCard[];
}

export function ConversionsByChannelChart({ cards }: ConversionsByChannelChartProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo<OrigemGroup[]>(() => {
    const cardBest = new Map<string, { tipoOrigem: string; origemLead: string; stage: string }>();

    for (const card of cards) {
      const stage = PHASE_FUNNEL_MAP[card.fase] || 'leads';
      const existing = cardBest.get(card.id);
      if (!existing || FUNNEL_ORDER.indexOf(stage) > FUNNEL_ORDER.indexOf(existing.stage)) {
        cardBest.set(card.id, {
          tipoOrigem: inferTipoOrigem(card),
          origemLead: inferOrigemLead(card),
          stage,
        });
      }
    }

    // Group by tipoOrigem -> origemLead
    const nested = new Map<string, Map<string, OrigemRow>>();

    for (const { tipoOrigem, origemLead, stage } of cardBest.values()) {
      if (!nested.has(tipoOrigem)) nested.set(tipoOrigem, new Map());
      const subMap = nested.get(tipoOrigem)!;
      if (!subMap.has(origemLead)) {
        subMap.set(origemLead, { tipoOrigem: origemLead, leads: 0, mqls: 0, rms: 0, rrs: 0, propostas: 0, vendas: 0 });
      }
      const sub = subMap.get(origemLead)!;
      for (const s of getCumulativeStages(stage)) {
        (sub as any)[s] += 1;
      }
    }

    const result: OrigemGroup[] = [];
    for (const [tipoOrigem, subMap] of nested) {
      const subRows = Array.from(subMap.values()).sort((a, b) => b.leads - a.leads);
      const row: OrigemRow = {
        tipoOrigem,
        leads: subRows.reduce((s, r) => s + r.leads, 0),
        mqls: subRows.reduce((s, r) => s + r.mqls, 0),
        rms: subRows.reduce((s, r) => s + r.rms, 0),
        rrs: subRows.reduce((s, r) => s + r.rrs, 0),
        propostas: subRows.reduce((s, r) => s + r.propostas, 0),
        vendas: subRows.reduce((s, r) => s + r.vendas, 0),
      };
      result.push({ row, subRows });
    }

    return result.sort((a, b) => b.row.leads - a.row.leads);
  }, [cards]);

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => ({
        leads: acc.leads + g.row.leads,
        mqls: acc.mqls + g.row.mqls,
        rms: acc.rms + g.row.rms,
        rrs: acc.rrs + g.row.rrs,
        propostas: acc.propostas + g.row.propostas,
        vendas: acc.vendas + g.row.vendas,
      }),
      { leads: 0, mqls: 0, rms: 0, rrs: 0, propostas: 0, vendas: 0 }
    );
  }, [groups]);

  const convRate = (leads: number, vendas: number) =>
    leads > 0 ? `${((vendas / leads) * 100).toFixed(1)}%` : '-';

  const toggle = (tipo: string) => setExpanded(prev => prev === tipo ? null : tipo);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Conversão por Tipo de Origem</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados de conversão por tipo de origem
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Origem</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">MQLs</TableHead>
                  <TableHead className="text-right">RM</TableHead>
                  <TableHead className="text-right">RR</TableHead>
                  <TableHead className="text-right">Propostas</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Conv. L→V</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(({ row, subRows }) => {
                  const isOpen = expanded === row.tipoOrigem;
                  return (
                    <>
                      <TableRow
                        key={row.tipoOrigem}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggle(row.tipoOrigem)}
                      >
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {isOpen
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            {row.tipoOrigem}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{row.leads}</TableCell>
                        <TableCell className="text-right">{row.mqls}</TableCell>
                        <TableCell className="text-right">{row.rms}</TableCell>
                        <TableCell className="text-right">{row.rrs}</TableCell>
                        <TableCell className="text-right">{row.propostas}</TableCell>
                        <TableCell className="text-right">{row.vendas}</TableCell>
                        <TableCell className="text-right">{convRate(row.leads, row.vendas)}</TableCell>
                      </TableRow>
                      {isOpen && subRows.map((sub) => (
                        <TableRow key={`${row.tipoOrigem}-${sub.tipoOrigem}`} className="bg-muted/30">
                          <TableCell className="pl-10 text-sm text-muted-foreground">{sub.tipoOrigem}</TableCell>
                          <TableCell className="text-right text-sm">{sub.leads}</TableCell>
                          <TableCell className="text-right text-sm">{sub.mqls}</TableCell>
                          <TableCell className="text-right text-sm">{sub.rms}</TableCell>
                          <TableCell className="text-right text-sm">{sub.rrs}</TableCell>
                          <TableCell className="text-right text-sm">{sub.propostas}</TableCell>
                          <TableCell className="text-right text-sm">{sub.vendas}</TableCell>
                          <TableCell className="text-right text-sm">{convRate(sub.leads, sub.vendas)}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell className="pl-10">Total</TableCell>
                  <TableCell className="text-right">{totals.leads}</TableCell>
                  <TableCell className="text-right">{totals.mqls}</TableCell>
                  <TableCell className="text-right">{totals.rms}</TableCell>
                  <TableCell className="text-right">{totals.rrs}</TableCell>
                  <TableCell className="text-right">{totals.propostas}</TableCell>
                  <TableCell className="text-right">{totals.vendas}</TableCell>
                  <TableCell className="text-right">{convRate(totals.leads, totals.vendas)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}