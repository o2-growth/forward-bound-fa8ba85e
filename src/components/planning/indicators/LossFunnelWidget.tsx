import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Users, DollarSign, Percent } from "lucide-react";
import { DetailSheet, DetailItem, columnFormatters } from "./DetailSheet";

interface LostCard {
  id: string;
  titulo: string;
  fase: string;
  faseAtual: string;
  valor: number;
  motivoPerda: string | null;
  closer: string | null;
  sdr: string | null;
  produto: string;
  dataEntrada: Date;
  lastPhaseBeforeLoss: string;
}

interface LossFunnelWidgetProps {
  lostCards: LostCard[];
  totalMqls: number;
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const PHASE_ORDER = [
  'Start form',
  'Lead',
  'Tentativas de contato',
  'Em contato',
  'MQL',
  'Reunião agendada / Qualificado',
  'Reunião Realizada',
  'Enviar proposta',
  'Proposta enviada / Follow Up',
  'Contrato em elaboração',
];

const PHASE_LABELS: Record<string, string> = {
  'Start form': 'Start Form',
  'Lead': 'Lead',
  'Tentativas de contato': 'Tentativas de Contato',
  'Em contato': 'Em Contato',
  'MQL': 'MQL',
  'Reunião agendada / Qualificado': 'RM',
  'Reunião Realizada': 'RR',
  'Enviar proposta': 'Enviar Proposta',
  'Proposta enviada / Follow Up': 'Proposta Enviada',
  'Contrato em elaboração': 'Contrato em Elaboração',
  'Remarcar reunião / No show': 'No Show',
};

const PHASE_COLORS: Record<string, string> = {
  'Start form': 'bg-gray-500',
  'Lead': 'bg-gray-400',
  'Tentativas de contato': 'bg-orange-400',
  'Em contato': 'bg-orange-500',
  'MQL': 'bg-yellow-500',
  'Reunião agendada / Qualificado': 'bg-blue-400',
  'Reunião Realizada': 'bg-blue-500',
  'Enviar proposta': 'bg-purple-400',
  'Proposta enviada / Follow Up': 'bg-purple-500',
  'Contrato em elaboração': 'bg-red-400',
};

export function LossFunnelWidget({ lostCards, totalMqls, isLoading }: LossFunnelWidgetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [sheetItems, setSheetItems] = useState<DetailItem[]>([]);

  const totalLost = lostCards.length;
  const totalValue = lostCards.reduce((sum, c) => sum + c.valor, 0);
  const lossRate = totalMqls > 0 ? Math.round((totalLost / totalMqls) * 100) : 0;

  // Group by last phase before loss
  const phaseGroups = new Map<string, LostCard[]>();
  for (const card of lostCards) {
    const phase = card.lastPhaseBeforeLoss || 'Outros';
    if (!phaseGroups.has(phase)) phaseGroups.set(phase, []);
    phaseGroups.get(phase)!.push(card);
  }

  // Sort by phase order, then by count
  const sortedPhases = Array.from(phaseGroups.entries()).sort((a, b) => {
    const ia = PHASE_ORDER.indexOf(a[0]);
    const ib = PHASE_ORDER.indexOf(b[0]);
    if (ia === -1 && ib === -1) return b[1].length - a[1].length;
    if (ia === -1) return 1;
    if (ib === -1) return 1;
    return ia - ib;
  });

  const maxCount = Math.max(...sortedPhases.map(([, cards]) => cards.length), 1);

  const toDetailItems = (cards: LostCard[]): DetailItem[] =>
    cards.map(c => ({
      id: c.id,
      name: c.titulo,
      phase: c.lastPhaseBeforeLoss,
      reason: c.motivoPerda || 'Não informado',
      value: c.valor,
      closer: c.closer || undefined,
      responsible: c.sdr || c.closer || undefined,
      product: c.produto,
      date: c.dataEntrada.toISOString().split('T')[0],
    }));

  const openDrillDown = (phase: string, cards: LostCard[]) => {
    setSheetTitle(`Perdidos em: ${PHASE_LABELS[phase] || phase}`);
    setSheetItems(toDetailItems(cards));
    setSheetOpen(true);
  };

  const openAllDrillDown = () => {
    setSheetTitle('Todos os Deals Perdidos');
    setSheetItems(toDetailItems(lostCards));
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Funil de Perdas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            Funil de Perdas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={openAllDrillDown}
              className="text-left p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                Total Perdidos
              </div>
              <div className="text-xl font-bold text-red-400">{totalLost}</div>
            </button>
            <div className="p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Valor Perdido
              </div>
              <div className="text-xl font-bold text-red-400">
                {totalValue >= 1000000
                  ? `R$ ${(totalValue / 1000000).toFixed(1)}M`
                  : totalValue >= 1000
                  ? `R$ ${Math.round(totalValue / 1000)}k`
                  : formatCurrency(totalValue)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Percent className="h-3 w-3" />
                Taxa de Perda
              </div>
              <div className="text-xl font-bold text-red-400">{lossRate}%</div>
            </div>
          </div>

          {/* Phase funnel bars */}
          {totalLost === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum deal perdido no período</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground mb-2">Última fase antes da perda</p>
              {sortedPhases.map(([phase, cards]) => {
                const pct = Math.round((cards.length / maxCount) * 100);
                const label = PHASE_LABELS[phase] || phase;
                const colorClass = PHASE_COLORS[phase] || 'bg-gray-500';

                return (
                  <button
                    key={phase}
                    onClick={() => openDrillDown(phase, cards)}
                    className="w-full flex items-center gap-2 group hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer text-left"
                  >
                    <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{label}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden">
                      <div
                        className={`h-full ${colorClass} rounded transition-all group-hover:opacity-80`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right shrink-0">{cards.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetTitle}
        description={`${sheetItems.length} deals perdidos`}
        items={sheetItems}
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'product', label: 'Produto' },
          { key: 'phase', label: 'Última Fase' },
          { key: 'reason', label: 'Motivo' },
          { key: 'value', label: 'Valor', format: columnFormatters.currency },
          { key: 'closer', label: 'Closer' },
          { key: 'date', label: 'Data' },
        ]}
      />
    </>
  );
}
