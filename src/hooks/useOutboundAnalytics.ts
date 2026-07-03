import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DetailItem } from "@/components/planning/indicators/DetailSheet";
import { IndicatorType } from "@/hooks/useFunnelRealized";
import type { ModeloAtualCard } from "./useModeloAtualAnalytics";
import { parseTemperatura } from "./useModeloAtualAnalytics";

// SDR fixo do pipe outbound (definido pelo user — todos os cards desse pipe
// são prospecção ativa do Matheus, independente do que vendedor_respons_vel diga).
const OUTBOUND_FIXED_SDR = "Matheus Staruck dos Reis";

// Mapeamento das fases do pipe outbound para o funil padrão.
// NO-SHOW e Contato futuro: decisões do user em 28/05/2026:
//   - NO-SHOW → ignorado (não conta no funil; reunião que não rolou ≠ RR)
//   - Contato futuro → MQL (lead em standby = ainda qualificado)
// Perdido → loss (sem contagem no funil, mas usado em LossAnalysisSection).
const PHASE_TO_INDICATOR: Record<string, IndicatorType | null> = {
  "LEADS/PROSPECTS": "leads",
  "Start form": "leads",
  "QUALIFICAÇÃO - MQL": "mql",
  "Contato futuro": "mql",
  "REUNIÃO AGENDADA": "rm",
  "REUNIÃO QUALIFICADA": "rr",
  Ganho: "venda",
  Perdido: null, // tratado como loss separadamente
  "NO-SHOW": null, // ignorado
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(value: any): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  let cleaned = String(value).replace(/[R$\s]/g, "").trim();
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  else if (hasComma) cleaned = cleaned.replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Card do pipe outbound parseado em formato compatível com `ModeloAtualCard`.
 * Marcas:
 *  - `responsavel` / `sdr` = Matheus Staruck dos Reis (fixo)
 *  - `closer` = `vendedor_respons_vel` quando preenchido
 *  - `tipoOrigem` = "Prospecção Ativa" → garante que classifyLeadSource
 *    retorne 'outbound' mesmo se o SDR override (Matheus) não estiver ativo.
 */
function parseOutboundRow(row: Record<string, any>): ModeloAtualCard {
  const fase = String(row["Fase"] || "").trim();
  const faseAtual = String(row["Fase Atual"] || "").trim();
  const destino = String(row["Destino"] || fase).trim();
  const dataEntrada = parseDate(row["Entrada"]) || new Date();
  const dataSaida = parseDate(row["Saída"]);
  const dataCriacao = parseDate(row["Data Criação"]);
  const dataAssinatura = parseDate(row["data_da_assinatura_do_contrato"]);

  const valorNeg = parseNumber(row["valor_do_neg_cio"]);
  const valorFinal = parseNumber(row["valor_final_negociado_r"]);
  // valor "final negociado" tem precedência quando preenchido;
  // caso contrário, usa valor do negócio (proposta).
  const valor = valorFinal > 0 ? valorFinal : valorNeg;

  const closer = String(row["vendedor_respons_vel"] || "").trim() || undefined;

  // Duração calculada dinamicamente
  let duracao = 0;
  if (dataSaida) {
    duracao = Math.floor((dataSaida.getTime() - dataEntrada.getTime()) / 1000);
  } else {
    duracao = Math.floor((Date.now() - dataEntrada.getTime()) / 1000);
  }

  return {
    id: String(row.ID || ""),
    titulo: String(row["Título"] || row["neg_cio"] || row["empresa"] || "").trim(),
    empresa: row["empresa"] ? String(row["empresa"]).trim() : undefined,
    contato: row["nome_do_contato"] ? String(row["nome_do_contato"]).trim() : undefined,
    fase,
    faseDestino: destino,
    dataEntrada,
    dataSaida,
    dataCriacao,
    dataAssinatura,
    valor,
    valorMRR: 0,
    valorPontual: 0,
    valorEducacao: 0,
    valorSetup: 0,
    responsavel: OUTBOUND_FIXED_SDR,
    sdr: OUTBOUND_FIXED_SDR,
    closer,
    faixa: row["tamanho_da_empresa"] ? String(row["tamanho_da_empresa"]) : undefined,
    duracao,
    // Marketing attribution: marca origem pra classifier retornar 'outbound'
    tipoOrigem: "Prospecção Ativa",
    origemLead: closer || undefined,
    fonte: String(row["canal_de_aquisi_o"] || "").trim() || undefined,
    motivoPerda: row["motivo_da_perda"] ? String(row["motivo_da_perda"]).trim() : undefined,
    faseAtual,
    produto: row["quais_servi_os_o_cliente_est_adquirindo"]
      ? String(row["quais_servi_os_o_cliente_est_adquirindo"]).trim()
      : undefined,
    temperatura: parseTemperatura(row),
  };
}

export function useOutboundAnalytics(startDate: Date, endDate: Date) {
  const startDateStr = useMemo(
    () => startDate.toISOString().split("T")[0],
    [startDate.getTime()]
  );
  const endDateStr = useMemo(
    () => endDate.toISOString().split("T")[0],
    [endDate.getTime()]
  );

  const startTime = useMemo(
    () =>
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      ).getTime(),
    [startDate.getTime()]
  );
  const endTime = useMemo(
    () =>
      new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999
      ).getTime(),
    [endDate.getTime()]
  );

  // Pipe pequeno (~329 rows total) — uma única query preview é suficiente.
  const { data, isLoading, error } = useQuery({
    queryKey: ["outbound-analytics", startDateStr, endDateStr],
    queryFn: async () => {
      const { data: resp, error: err } = await supabase.functions.invoke(
        "query-external-db",
        {
          body: {
            table: "pipefy_moviment_outbound",
            action: "preview",
            limit: 5000,
          },
        }
      );
      if (err) {
        console.error("[useOutboundAnalytics] fetch error:", err);
        throw err;
      }
      const rows: any[] = resp?.data || [];
      const cards = rows.map(parseOutboundRow);
      console.log(`[useOutboundAnalytics] Loaded ${cards.length} outbound movements`);
      return { cards };
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const cards = data?.cards ?? [];

  const valueByCardId = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of cards) {
      const current = map.get(card.id) || 0;
      if ((card.valor || 0) > current) map.set(card.id, card.valor || 0);
    }
    return map;
  }, [cards]);

  // Cards filtrados por período (dataEntrada dentro do range)
  const cardsInPeriod = useMemo(() => {
    return cards.filter((c) => {
      const t = c.dataEntrada.getTime();
      return t >= startTime && t <= endTime;
    });
  }, [cards, startTime, endTime]);

  /**
   * Retorna cards cuja fase de DESTINO mapeia para o indicador solicitado,
   * dentro do período. Mesma lógica dos outros analytics hooks.
   */
  const getCardsForIndicator = useMemo(() => {
    return (indicator: IndicatorType): ModeloAtualCard[] => {
      const result: ModeloAtualCard[] = [];
      const seen = new Set<string>();
      for (const c of cardsInPeriod) {
        // Usa destino quando disponível (= próxima fase para onde o card foi)
        const phase = c.faseDestino || c.fase;
        if (PHASE_TO_INDICATOR[phase] === indicator) {
          // Dedup: 1 entrada por card+indicator (primeira passagem na fase)
          if (!seen.has(c.id)) {
            seen.add(c.id);
            result.push(c);
          }
        }
      }
      return result;
    };
  }, [cardsInPeriod]);

  /**
   * Converte cards para DetailItem (formato consumido por DetailSheet e
   * filtros downstream). Mesmo shape do `toDetailItem` do modelo atual.
   */
  const toDetailItem = (card: ModeloAtualCard): DetailItem => {
    const value = card.valor > 0 ? card.valor : valueByCardId.get(card.id) || 0;
    return ({
    id: card.id,
    name: card.empresa || card.titulo || card.id,
    company: card.empresa,
    phase: card.faseAtual || card.faseDestino,
    date: card.dataEntrada.toISOString(),
    value,
    reason: card.motivoPerda,
    revenueRange: card.faixa,
    responsible: card.responsavel,
    duration: card.duracao,
    product: card.produto,
    mrr: card.valorMRR || 0,
    setup: card.valorSetup || 0,
    pontual: card.valorPontual || value,
    total: (card.valorMRR || 0) + (card.valorSetup || 0) + (card.valorPontual || value),
    closer: card.closer,
    sdr: card.sdr,
    dataAssinatura: card.dataAssinatura?.toISOString(),
    // Marketing attribution — para passar pelo classifier:
    tipoOrigem: card.tipoOrigem,
    origemLead: card.origemLead,
    fonte: card.fonte,
    campanha: card.campanha,
  });
  };

  const getDetailItemsForIndicator = useMemo(() => {
    return (indicator: IndicatorType): DetailItem[] => {
      return getCardsForIndicator(indicator).map(toDetailItem);
    };
  }, [getCardsForIndicator]);

  return {
    cards: cardsInPeriod,
    allCards: cards,
    isLoading,
    error,
    getCardsForIndicator,
    getDetailItemsForIndicator,
    toDetailItem,
  };
}
