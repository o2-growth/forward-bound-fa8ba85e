import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, AlertTriangle, CheckCircle2, XCircle, Clock, HelpCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Phase to indicator mapping (Modelo Atual - pipefy_moviment_cfos)
const MA_PHASE_TO_INDICATOR: Record<string, string> = {
  'Novos Leads': 'Leads',
  'MQLs': 'MQL',
  'Tentativas de contato': 'MQL',
  'Material ISCA': 'MQL',
  'Reuniao agendada / Qualificado': 'RM (Reuniao Marcada)',
  'Reuniao Realizada': 'RR (Reuniao Realizada)',
  '1\u00b0 Reuniao Realizada - Apresentacao': 'RR (Reuniao Realizada)',
  'Proposta enviada / Follow Up': 'Proposta',
  'Contrato assinado': 'Venda',
};

// Phase to indicator mapping (Expansao - pipefy_cards_movements_expansao)
const EXP_PHASE_TO_INDICATOR: Record<string, string> = {
  'Start form': 'Leads',
  'Lead': 'Leads',
  'MQL': 'MQL',
  'Reuniao agendada / Qualificado': 'RM (Reuniao Marcada)',
  'Reuniao Realizada': 'RR (Reuniao Realizada)',
  'Proposta enviada / Follow Up': 'Proposta',
  'Contrato assinado': 'Venda',
};

// Merge both maps for display
const ALL_PHASE_TO_INDICATOR: Record<string, string> = {
  ...EXP_PHASE_TO_INDICATOR,
  ...MA_PHASE_TO_INDICATOR,
};

const MQL_QUALIFYING_TIERS = [
  'Entre R$ 200 mil e R$ 350 mil',
  'Entre R$ 350 mil e R$ 500 mil',
  'Entre R$ 500 mil e R$ 1 milhao',
  'Entre R$ 1 milhao e R$ 5 milhoes',
  'Acima de R$ 5 milhoes',
];

const MQL_EXCLUDED_LOSS_REASONS = [
  'Duplicado',
  'Pessoa fisica, fora do ICP',
  'Nao e uma demanda real',
  'Buscando parceria',
  'Quer solucoes para cliente',
  'Nao e MQL, mas entrou como MQL',
  'Email/Telefone Invalido',
];

const INDICATOR_ORDER = ['Leads', 'MQL', 'RM (Reuniao Marcada)', 'RR (Reuniao Realizada)', 'Proposta', 'Venda'];

function normalizeStr(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

const NORMALIZED_PHASE_TO_INDICATOR: Record<string, string> = Object.fromEntries(
  Object.entries(ALL_PHASE_TO_INDICATOR).map(([k, v]) => [normalizeStr(k), v])
);

function getIndicatorForPhase(fase: string): string | undefined {
  if (!fase) return undefined;
  return NORMALIZED_PHASE_TO_INDICATOR[normalizeStr(fase)];
}

interface Movement {
  id: string;
  titulo: string;
  fase: string;
  faseAtual: string;
  entrada: Date;
  dataCriacao: Date | null;
  sdr: string;
  closer: string;
  faixaFaturamento: string;
  motivoPerda: string;
  fonte: string;
  table: string;
}

interface DiagnosticResult {
  indicator: string;
  counts: boolean;
  month: string | null;
  reason: string;
}

interface Problem {
  severity: 'warning' | 'info';
  message: string;
}

interface CardResult {
  id: string;
  titulo: string;
  sdr: string;
  closer: string;
  faixaFaturamento: string;
  faseAtual: string;
  fonte: string;
  table: string;
  movements: Movement[];
  diagnostics: DiagnosticResult[];
  problems: Problem[];
}

function parseDate(dateValue: string | null | undefined): Date | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateBR(date: Date | null): string {
  if (!date) return '—';
  return format(date, 'dd/MMM', { locale: ptBR });
}

function getMonthLabel(date: Date): string {
  return format(date, 'MMM/yy', { locale: ptBR });
}

function buildDiagnostics(movements: Movement[], faixaFaturamento: string, motivoPerda: string): { diagnostics: DiagnosticResult[]; problems: Problem[] } {
  const diagnostics: DiagnosticResult[] = [];
  const problems: Problem[] = [];

  // Find the first movement for each indicator
  const indicatorFirstDate: Record<string, Date> = {};
  for (const m of movements) {
    const indicator = getIndicatorForPhase(m.fase);
    if (indicator && (!indicatorFirstDate[indicator] || m.entrada < indicatorFirstDate[indicator])) {
      indicatorFirstDate[indicator] = m.entrada;
    }
  }

  // Check MQL qualification
  const hasMqlPhase = movements.some(m => {
    const ind = getIndicatorForPhase(m.fase);
    return ind === 'MQL' || ind === 'Leads';
  });

  const faixaQualifies = MQL_QUALIFYING_TIERS.some(t => normalizeStr(t) === normalizeStr(faixaFaturamento || ''));
  const isExcludedByLoss = motivoPerda && MQL_EXCLUDED_LOSS_REASONS.some(r => normalizeStr(r) === normalizeStr(motivoPerda));

  for (const indicator of INDICATOR_ORDER) {
    const date = indicatorFirstDate[indicator];

    if (indicator === 'MQL') {
      // MQL has special logic: needs qualifying faixa and no excluded loss
      if (!hasMqlPhase) {
        diagnostics.push({ indicator, counts: false, month: null, reason: 'Sem movimento em fase MQL' });
      } else if (!faixaFaturamento || faixaFaturamento === 'Selecione') {
        diagnostics.push({ indicator, counts: false, month: null, reason: `Faixa vazia ou "Selecione" — nao qualifica` });
      } else if (!faixaQualifies) {
        diagnostics.push({ indicator, counts: false, month: null, reason: `Faixa "${faixaFaturamento}" < R$ 200k — nao qualifica` });
      } else if (isExcludedByLoss) {
        diagnostics.push({ indicator, counts: false, month: null, reason: `Motivo da perda "${motivoPerda}" exclui do MQL` });
      } else {
        // MQL counts by creation date, but we show the movement month
        const mqlDate = date || movements[0]?.entrada;
        diagnostics.push({ indicator, counts: true, month: mqlDate ? getMonthLabel(mqlDate) : null, reason: `Faixa >= R$ 200k, qualificado` });
      }
    } else if (date) {
      diagnostics.push({ indicator, counts: true, month: getMonthLabel(date), reason: `Entrada ${formatDateBR(date)}` });
    } else {
      const missingPhases: Record<string, string> = {
        'Leads': 'Novos Leads / Start form',
        'RM (Reuniao Marcada)': 'Reuniao agendada / Qualificado',
        'RR (Reuniao Realizada)': 'Reuniao Realizada',
        'Proposta': 'Proposta enviada / Follow Up',
        'Venda': 'Contrato assinado',
      };
      diagnostics.push({ indicator, counts: false, month: null, reason: `Sem movimento "${missingPhases[indicator] || indicator}"` });
    }
  }

  // Detect problems
  const unmappedPhases = movements.filter(m => !getIndicatorForPhase(m.fase));
  const uniqueUnmapped = [...new Set(unmappedPhases.map(m => m.fase))];
  for (const phase of uniqueUnmapped) {
    problems.push({ severity: 'warning', message: `Fase "${phase}" nao e mapeada no dashboard — este movimento e invisivel` });
  }

  const firstMovement = movements[0];
  if (firstMovement) {
    if (!firstMovement.sdr || firstMovement.sdr.trim() === '') {
      problems.push({ severity: 'warning', message: 'SDR vazio — card desaparece ao filtrar por SDR' });
    }
    if (!firstMovement.closer || firstMovement.closer.trim() === '') {
      problems.push({ severity: 'info', message: 'Closer vazio — card desaparece ao filtrar por Closer' });
    }
  }

  if (!faixaFaturamento || faixaFaturamento === 'Selecione' || faixaFaturamento.trim() === '') {
    problems.push({ severity: 'warning', message: `Faixa de faturamento vazia ou "Selecione" — nao qualifica como MQL` });
  } else if (!faixaQualifies) {
    problems.push({ severity: 'warning', message: `Faixa "${faixaFaturamento}" nao qualifica como MQL (minimo R$ 200k)` });
  }

  if (isExcludedByLoss) {
    problems.push({ severity: 'warning', message: `Motivo da perda "${motivoPerda}" exclui o card do MQL` });
  }

  // Check if RM date is in a different month from what might be expected
  const rmDate = indicatorFirstDate['RM (Reuniao Marcada)'];
  const rrDate = indicatorFirstDate['RR (Reuniao Realizada)'];
  if (rmDate && rrDate) {
    const rmMonth = rmDate.getMonth();
    const rrMonth = rrDate.getMonth();
    if (rmMonth !== rrMonth) {
      problems.push({ severity: 'info', message: `RM registrada em ${getMonthLabel(rmDate)}, RR em ${getMonthLabel(rrDate)} — aparecem em meses diferentes` });
    }
  }

  return { diagnostics, problems };
}

async function searchCards(searchTerm: string): Promise<CardResult[]> {
  const tables = ['pipefy_moviment_cfos', 'pipefy_cards_movements_expansao'] as const;
  const tableLabels: Record<string, string> = {
    pipefy_moviment_cfos: 'Modelo Atual',
    pipefy_cards_movements_expansao: 'Expansao',
  };

  const isIdSearch = /^\d+$/.test(searchTerm.trim());
  const searchColumn = isIdSearch ? 'ID' : 'Título';

  const requests = tables.map(table =>
    supabase.functions.invoke('query-external-db', {
      body: {
        table,
        action: 'search',
        searchTerm: searchTerm.trim(),
        searchColumn,
        limit: 500,
      },
    })
  );

  const responses = await Promise.all(requests);

  const allResults: CardResult[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const response = responses[i];

    if (response.error || !response.data?.data) continue;

    const rows = response.data.data as Record<string, any>[];
    if (rows.length === 0) continue;

    // Group by card ID
    const cardMap = new Map<string, Record<string, any>[]>();
    for (const row of rows) {
      const id = String(row['ID'] || row['id'] || '');
      if (!id) continue;
      if (!cardMap.has(id)) cardMap.set(id, []);
      cardMap.get(id)!.push(row);
    }

    for (const [id, cardRows] of cardMap) {
      // Sort by entry date
      const movements: Movement[] = cardRows
        .map(row => ({
          id,
          titulo: row['Título'] || row['Titulo'] || row['titulo'] || row['Empresa'] || row['Nome'] || '',
          fase: row['Fase'] || row['fase'] || '',
          faseAtual: row['Fase Atual'] || row['fase_atual'] || '',
          entrada: parseDate(row['Entrada'] || row['entrada']) || new Date(),
          dataCriacao: parseDate(row['Data Criação'] || row['Data Criacao']),
          sdr: row['SDR responsável'] || row['SDR responsavel'] || row['sdr_responsavel'] || '',
          closer: row['Closer responsável'] || row['Closer responsavel'] || row['closer_responsavel'] || '',
          faixaFaturamento: row['Faixa de faturamento mensal'] || row['Faixa'] || row['faixa'] || '',
          motivoPerda: row['Motivo da perda'] || row['motivo_perda'] || '',
          fonte: tableLabels[table],
          table,
        }))
        .sort((a, b) => a.entrada.getTime() - b.entrada.getTime());

      const latest = movements[movements.length - 1];
      const faixa = movements.find(m => m.faixaFaturamento)?.faixaFaturamento || '';
      const motivo = movements.find(m => m.motivoPerda)?.motivoPerda || '';

      const { diagnostics, problems } = buildDiagnostics(movements, faixa, motivo);

      allResults.push({
        id,
        titulo: latest.titulo || movements[0]?.titulo || '',
        sdr: movements.find(m => m.sdr)?.sdr || '',
        closer: movements.find(m => m.closer)?.closer || '',
        faixaFaturamento: faixa,
        faseAtual: latest.faseAtual || latest.fase,
        fonte: tableLabels[table],
        table,
        movements,
        diagnostics,
        problems,
      });
    }
  }

  return allResults;
}

interface CardInvestigatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardInvestigator({ open, onOpenChange }: CardInvestigatorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CardResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const cards = await searchCards(searchTerm);
      setResults(cards);

      if (cards.length === 0) {
        setError('Card nao encontrado no banco de dados. Verifique o nome ou ID.');
      }
    } catch (err) {
      console.error('[CardInvestigator] Search error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar card');
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Card Investigator
          </SheetTitle>
          <SheetDescription>
            Busque um card por nome ou ID para diagnosticar por que ele aparece (ou nao) em cada indicador.
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Input
            placeholder="Nome da empresa ou ID do card..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-1">Buscar</span>
          </Button>
        </div>

        {/* Cards com problemas conhecidos — atalhos rápidos */}
        {!results && !isSearching && (
          <div className="mt-4 space-y-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground font-medium">Cards com problemas detectados:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { nome: 'Odoni', motivo: 'Não existe no banco', cor: 'destructive' as const },
                { nome: 'Luciano Jardon', motivo: 'RM em Mar, sem mov. Abr', cor: 'secondary' as const },
                { nome: 'Gabriel Soares', motivo: 'No-show não mapeado', cor: 'secondary' as const },
                { nome: 'Adriano Patelli', motivo: 'No-show não mapeado', cor: 'secondary' as const },
                { nome: 'Delta Publicidade', motivo: 'SDR vazio', cor: 'destructive' as const },
                { nome: 'Ferraz H', motivo: 'No-show não mapeado', cor: 'secondary' as const },
                { nome: 'Grupo Viseu', motivo: 'RR atualizado tarde', cor: 'secondary' as const },
              ].map(card => (
                <Badge
                  key={card.nome}
                  variant={card.cor}
                  className="cursor-pointer text-[10px] hover:opacity-80"
                  onClick={() => { setSearchTerm(card.nome); }}
                  title={card.motivo}
                >
                  {card.nome} — {card.motivo}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 mt-4 pr-2">
          {error && !results?.length && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {results && results.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 mb-4">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Atencao: {results.length} cards encontrados com este termo</span>
            </div>
          )}

          {results?.map(card => (
            <div key={`${card.table}-${card.id}`} className="mb-6 border rounded-lg p-4 space-y-4">
              {/* Card header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-base">{card.titulo || '(sem titulo)'}</span>
                  <Badge variant="outline" className="text-xs">ID: {card.id}</Badge>
                  <Badge variant="secondary" className="text-xs">{card.fonte}</Badge>
                  <a
                    href={`https://app.pipefy.com/open-cards/${card.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir no Pipefy
                  </a>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <div>SDR: <span className={card.sdr ? 'text-foreground' : 'text-destructive font-medium'}>{card.sdr || '(vazio)'}</span> | Closer: <span className={card.closer ? 'text-foreground' : 'text-muted-foreground'}>{card.closer || '(vazio)'}</span></div>
                  <div>Faixa: <span className={card.faixaFaturamento ? 'text-foreground' : 'text-destructive font-medium'}>{card.faixaFaturamento || '(vazio)'}</span></div>
                  <div>Fase Atual: <span className="text-foreground font-medium">{card.faseAtual}</span></div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Timeline de Movimentacoes</h4>
                <div className="space-y-1 font-mono text-xs">
                  {card.movements.map((m, idx) => {
                    const indicator = getIndicatorForPhase(m.fase);
                    const isMapped = !!indicator;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 py-0.5 ${!isMapped ? 'text-muted-foreground' : ''}`}
                      >
                        <span className="w-16 flex-shrink-0 text-right tabular-nums">
                          {formatDateBR(m.entrada)}
                        </span>
                        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span className={`flex-1 ${isMapped ? 'font-medium' : ''}`}>{m.fase}</span>
                        {isMapped && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                            {indicator} {getMonthLabel(m.entrada)}
                          </Badge>
                        )}
                        {!isMapped && (
                          <HelpCircle className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostics */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Diagnostico por Indicador</h4>
                <div className="space-y-1 text-sm">
                  {card.diagnostics.map((d, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {d.counts ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="font-medium w-12 flex-shrink-0">{d.indicator.split(' ')[0]}:</span>
                      <span className={d.counts ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {d.counts ? 'SIM' : 'NAO'}
                        {d.month && ` (${d.month})`}
                      </span>
                      <span className="text-muted-foreground">— {d.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Problems */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Possiveis Problemas</h4>
                {card.problems.length === 0 ? (
                  <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Nenhum problema encontrado
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    {card.problems.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertTriangle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${p.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                        <span>{p.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
