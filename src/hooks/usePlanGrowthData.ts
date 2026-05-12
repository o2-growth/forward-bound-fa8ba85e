import { useMemo, useEffect, useRef } from "react";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { useMonetaryMetas, BuType, isPontualOnlyBU } from "./useMonetaryMetas";
import { useFunnelMetas } from "./useFunnelMetas";
import { useBUIndicatorsConfig } from "./useBUIndicatorsConfig";
import { useMrrBase } from "./useMrrBase";

// Indicadores de 2025 (base para projeção)
const indicators2025 = {
  cpv: 6517.05,
};

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Unit-based targets for each BU
const oxyHackerUnits: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 2,
  Abr: 5, Mai: 5, Jun: 5,
  Jul: 10, Ago: 10, Set: 10,
  Out: 15, Nov: 18, Dez: 17,
};
const franquiaUnits: Record<string, number> = {
  Jan: 0, Fev: 1, Mar: 1,
  Abr: 1, Mai: 1, Jun: 1,
  Jul: 2, Ago: 2, Set: 2,
  Out: 3, Nov: 3, Dez: 3,
};

// Annual funnel targets for external BUs (aligned with reference baseline)
// These are the OPERATIONAL targets, not derived from reverse funnel calculations
const externalBUAnnualMetas = {
  o2Tax: { mql: 504, rm: 180, rr: 96, proposta: 72, venda: 12 },     // 42, 15, 8, 6, 1 per month
  franquia: { mql: 360, rm: 144, rr: 72, proposta: 48, venda: 12 }, // 30, 12, 6, 4, 1 per month
  oxyHacker: { mql: 300, rm: 120, rr: 60, proposta: 36, venda: 12 }, // 25, 10, 5, 3, 1 per month
};

// Distribute annual targets evenly across months
function distributeAnnualToMonthly(annualMetas: { mql: number; rm: number; rr: number; proposta: number; venda: number }) {
  return months.map(month => ({
    month,
    mqls: Math.round(annualMetas.mql / 12),
    rms: Math.round(annualMetas.rm / 12),
    rrs: Math.round(annualMetas.rr / 12),
    propostas: Math.round(annualMetas.proposta / 12),
    vendas: Math.round(annualMetas.venda / 12),
  }));
}

// BU Indicators configuration
interface BUIndicators {
  ticketMedio: number;
  cpv: number;
  mqlToRm: number;
  rmToRr: number;
  rrToProp: number;
  propToVenda: number;
  leadToMql: number;
}

const DEFAULT_INDICADORES: Record<string, BUIndicators> = {
  modeloAtual: {
    ticketMedio: 17000,
    cpv: 6517.05,
    mqlToRm: 0.49,
    rmToRr: 0.72,
    rrToProp: 0.88,
    propToVenda: 0.24,
    leadToMql: 0.43,
  },
  o2Tax: {
    ticketMedio: 15000,
    cpv: 2500,
    mqlToRm: 0.45,
    rmToRr: 0.65,
    rrToProp: 0.80,
    propToVenda: 0.20,
    leadToMql: 0.35,
  },
  oxyHacker: {
    ticketMedio: 54000,
    cpv: 5000,
    mqlToRm: 0.40,
    rmToRr: 0.60,
    rrToProp: 0.75,
    propToVenda: 0.15,
    leadToMql: 0.25,
  },
  franquia: {
    ticketMedio: 140000,
    cpv: 12000,
    mqlToRm: 0.35,
    rmToRr: 0.55,
    rrToProp: 0.70,
    propToVenda: 0.12,
    leadToMql: 0.20,
  },
};

// Quarterly targets
const metasTrimestrais = {
  Q1: 3750000,
  Q2: 4500000,
  Q3: 6000000,
  Q4: 8000000,
};

const quarterlyTotalsOutrasBUs = {
  o2Tax: { Q1: 412224, Q2: 587220.48, Q3: 781590.46, Q4: 1040296.90 },
  oxyHacker: { Q1: 5 * 54000, Q2: 15 * 54000, Q3: 30 * 54000, Q4: 50 * 54000 },
  franquia: { Q1: 2 * 140000, Q2: 3 * 140000, Q3: 6 * 140000, Q4: 9 * 140000 },
};

// Helper functions
function distributeQuarterlyToMonthly(
  quarterlyData: { Q1: number; Q2: number; Q3: number; Q4: number }
): Record<string, number> {
  const monthlyMetas: Record<string, number> = {};
  
  const quarterWeights = {
    Q1: { Jan: 0.30, Fev: 0.33, Mar: 0.37 },
    Q2: { Abr: 0.30, Mai: 0.33, Jun: 0.37 },
    Q3: { Jul: 0.30, Ago: 0.33, Set: 0.37 },
    Q4: { Out: 0.33, Nov: 0.37, Dez: 0.30 },
  };
  
  monthlyMetas["Jan"] = quarterlyData.Q1 * quarterWeights.Q1.Jan;
  monthlyMetas["Fev"] = quarterlyData.Q1 * quarterWeights.Q1.Fev;
  monthlyMetas["Mar"] = quarterlyData.Q1 * quarterWeights.Q1.Mar;
  
  monthlyMetas["Abr"] = quarterlyData.Q2 * quarterWeights.Q2.Abr;
  monthlyMetas["Mai"] = quarterlyData.Q2 * quarterWeights.Q2.Mai;
  monthlyMetas["Jun"] = quarterlyData.Q2 * quarterWeights.Q2.Jun;
  
  monthlyMetas["Jul"] = quarterlyData.Q3 * quarterWeights.Q3.Jul;
  monthlyMetas["Ago"] = quarterlyData.Q3 * quarterWeights.Q3.Ago;
  monthlyMetas["Set"] = quarterlyData.Q3 * quarterWeights.Q3.Set;
  
  monthlyMetas["Out"] = quarterlyData.Q4 * quarterWeights.Q4.Out;
  monthlyMetas["Nov"] = quarterlyData.Q4 * quarterWeights.Q4.Nov;
  monthlyMetas["Dez"] = quarterlyData.Q4 * quarterWeights.Q4.Dez;
  
  return monthlyMetas;
}

function calculateMonthlyValuesSmooth(
  quarterlyData: { Q1: number; Q2: number; Q3: number; Q4: number },
  initialValue: number
) {
  const monthlyValues: Record<string, number> = {};
  const weights = {
    Jan: 1.00, Fev: 1.02, Mar: 1.08,
    Abr: 1.14, Mai: 1.20, Jun: 1.28,
    Jul: 1.38, Ago: 1.50, Set: 1.65,
    Out: 1.82, Nov: 2.00, Dez: 1.60,
  };
  
  const rawValues: Record<string, number> = {};
  months.forEach(month => {
    rawValues[month] = initialValue * weights[month as keyof typeof weights];
  });
  
  const scaleQuarter = (quarterMonths: string[], quarterTotal: number) => {
    const rawQuarterSum = quarterMonths.reduce((sum, m) => sum + rawValues[m], 0);
    const scale = quarterTotal / rawQuarterSum;
    quarterMonths.forEach(m => {
      monthlyValues[m] = rawValues[m] * scale;
    });
  };
  
  scaleQuarter(["Jan", "Fev", "Mar"], quarterlyData.Q1);
  scaleQuarter(["Abr", "Mai", "Jun"], quarterlyData.Q2);
  scaleQuarter(["Jul", "Ago", "Set"], quarterlyData.Q3);
  scaleQuarter(["Out", "Nov", "Dez"], quarterlyData.Q4);
  
  return monthlyValues;
}

function calculateFromUnits(units: Record<string, number>, ticketValue: number): Record<string, number> {
  const result: Record<string, number> = {};
  months.forEach(month => {
    result[month] = units[month] * ticketValue;
  });
  return result;
}

function calculateMrrAndRevenueToSell(
  mrrInicial: number, 
  churnRate: number, 
  retencaoRate: number,
  metasMensais: Record<string, number>,
  ticketMedio: number,
  valorVenderInicial: number = 0
): { mrrPorMes: Record<string, number>; vendasPorMes: Record<string, number>; revenueToSell: Record<string, number> } {
  const mrrPorMes: Record<string, number> = {};
  const vendasPorMes: Record<string, number> = {};
  const revenueToSell: Record<string, number> = {};
  
  let mrrAtual = valorVenderInicial > 0 
    ? metasMensais["Jan"] - valorVenderInicial 
    : mrrInicial;
  
  let aVenderAnterior = 0;
  
  months.forEach((month, index) => {
    if (index > 0) {
      mrrAtual = mrrAtual * (1 - churnRate);
    }
    
    const retencaoDoMesAnterior = aVenderAnterior * retencaoRate;
    mrrAtual = mrrAtual + retencaoDoMesAnterior;
    
    mrrPorMes[month] = mrrAtual;
    
    const metaDoMes = metasMensais[month];
    const aVender = Math.max(0, metaDoMes - mrrAtual);
    revenueToSell[month] = aVender;
    
    const vendasDoMes = Math.round(aVender / ticketMedio);
    vendasPorMes[month] = vendasDoMes;
    aVenderAnterior = aVender;
  });
  
  return { mrrPorMes, vendasPorMes, revenueToSell };
}

interface FunnelData {
  month: string;
  faturamentoMeta: number;
  faturamentoVender: number;
  mrrBase: number;
  vendas: number;
  propostas: number;
  rrs: number;
  rms: number;
  mqls: number;
  leads: number;
  investimento: number;
}

function calculateReverseFunnel(
  netRevenueToSell: Record<string, number>,
  metrics: BUIndicators,
  mrrComChurn: Record<string, number> | null = null,
  metasMensais: Record<string, number> | null = null,
  cpvValue: number,
  investimentoInicialJan: number = 0
): FunnelData[] {
  let investimentoAnterior = 0;
  
  const dadosOriginais = months.map(month => {
    const faturamentoVender = netRevenueToSell[month];
    const mrrBaseAtual = mrrComChurn ? mrrComChurn[month] : 0;
    // When MRR chain is available, compute faturamentoMeta = mrrBase + adjustedAVender for consistency
    const faturamentoMeta = mrrComChurn 
      ? (mrrBaseAtual + faturamentoVender) 
      : (metasMensais ? metasMensais[month] : faturamentoVender);
    
    const vendas = faturamentoVender / metrics.ticketMedio;
    const propostas = vendas / metrics.propToVenda;
    const rrs = propostas / metrics.rrToProp;
    const rms = rrs / metrics.rmToRr;
    const mqls = rms / metrics.mqlToRm;
    const leads = mqls / metrics.leadToMql;
    
    const investimentoCalculado = vendas * cpvValue;
    const investimento = Math.max(investimentoCalculado, investimentoAnterior);
    investimentoAnterior = investimento;
    
    return {
      month,
      faturamentoMeta,
      faturamentoVender,
      mrrBase: mrrBaseAtual,
      vendas: Math.ceil(vendas),
      propostas: Math.ceil(propostas),
      rrs: Math.ceil(rrs),
      rms: Math.ceil(rms),
      mqls: Math.ceil(mqls),
      leads: Math.ceil(leads),
      investimento: Math.round(investimento),
    };
  });
  
  return dadosOriginais.map((dados, index) => {
    if (index === 0 && investimentoInicialJan > 0) {
      const vendasIniciais = Math.ceil(investimentoInicialJan / cpvValue);
      const propostas = Math.ceil(vendasIniciais / metrics.propToVenda);
      const rrs = Math.ceil(propostas / metrics.rrToProp);
      const rms = Math.ceil(rrs / metrics.rmToRr);
      const mqls = Math.ceil(rms / metrics.mqlToRm);
      const leads = Math.ceil(mqls / metrics.leadToMql);
      
      return { 
        ...dados, 
        investimento: investimentoInicialJan,
        vendas: vendasIniciais,
        propostas,
        rrs,
        rms,
        mqls,
        leads,
      };
    }
    
    const investimentoDeslocado = index < months.length - 1 
      ? dadosOriginais[index + 1].investimento 
      : dados.investimento;
    
    return {
      ...dados,
      investimento: investimentoDeslocado,
    };
  });
}

/**
 * Hook that calculates Plan Growth funnel data and publishes it to the MediaMetasContext.
 * This ensures the data is available on app initialization without needing to visit the Plan Growth tab.
 */
export function usePlanGrowthData() {
  const { setMetasPorBU, setFunnelData, isLoaded } = useMediaMetas();
  const { metas, isLoading: isLoadingMetas } = useMonetaryMetas();
  const { funnelMetas, isLoading: isLoadingFunnel, hasFunnelForBU, getFunnelForBU, bulkUpsert, lockMonths } = useFunnelMetas();
  const { getIndicatorsMap, getIndicatorsForBU, isLoading: isLoadingIndicators } = useBUIndicatorsConfig();
  const { mrrBaseData, isLoading: isLoadingMrrBase } = useMrrBase();
  const hasSeeded = useRef(false);
  const hasAutoLocked = useRef(false);

  // Build a map of MRR Base real (Oxy truth) by month for the current planning year (2026)
  // MRR Base de cada mês = MRR realizado do mês ANTERIOR (Oxy truth).
  // Ex.: MRR Base de Fev/26 = MRR de Jan/26; MRR Base de Jan/26 = MRR de Dez/25.
  const mrrBaseRealPorMes = useMemo(() => {
    const PLAN_YEAR = 2026;
    const lookup = new Map<string, number>();
    (mrrBaseData || []).forEach(r => {
      lookup.set(`${r.year}-${r.month}`, Number(r.value) || 0);
    });
    const map: Record<string, number> = {};
    months.forEach((m, idx) => {
      const prevMonth = idx === 0 ? 'Dez' : months[idx - 1];
      const prevYear = idx === 0 ? PLAN_YEAR - 1 : PLAN_YEAR;
      const v = lookup.get(`${prevYear}-${prevMonth}`);
      if (v && v > 0) map[m] = v;
    });
    return map;
  }, [mrrBaseData]);

  // Seed do PROJETADO Dez/2025 — decoupled da Oxy real.
  // Oxy real continua disponível em mrrBaseRealPorMes para o badge de gap por mês,
  // e a regra de gap (linhas ~438-466) joga o saldo (projetado − real) para Dez.
  const MRR_PROJECTED_SEED_DEZ_2025 = 725000;
  const mrrInicial = useMemo(() => MRR_PROJECTED_SEED_DEZ_2025, []);

  // Valor a vender inicial real = faturamento_vender de Jan/2026 (Modelo Atual) em funnel_metas.
  // Fallback 400k se ainda não tem dado.
  const valorVenderInicial = useMemo(() => {
    const janRow = funnelMetas.find(m => m.bu === 'modelo_atual' && m.month === 'Jan' && m.year === 2026);
    const v = Number(janRow?.faturamento_vender || 0);
    return v > 0 ? v : 400000;
  }, [funnelMetas]);

  const churnMensal = 0.05;
  const retencaoVendas = 0.25;

  // Build indicadoresPorBU: DB values override hardcoded defaults
  const indicadoresPorBU = useMemo(() => {
    const dbMap = getIndicatorsMap();
    const buKeyMap: Record<string, string> = {
      modelo_atual: 'modeloAtual',
      o2_tax: 'o2Tax',
      oxy_hacker: 'oxyHacker',
      franquia: 'franquia',
    };
    const result = { ...DEFAULT_INDICADORES };
    if (dbMap) {
      for (const [dbKey, stateKey] of Object.entries(buKeyMap)) {
        if (dbMap[dbKey]) {
          const db = dbMap[dbKey];
          result[stateKey] = {
            ...DEFAULT_INDICADORES[stateKey], // keep leadToMql fallback
            ticketMedio: db.ticketMedio || DEFAULT_INDICADORES[stateKey].ticketMedio,
            cpv: db.cpv || DEFAULT_INDICADORES[stateKey].cpv,
            mqlToRm: db.mqlToRm || DEFAULT_INDICADORES[stateKey].mqlToRm,
            rmToRr: db.rmToRr || DEFAULT_INDICADORES[stateKey].rmToRr,
            rrToProp: db.rrToProp || DEFAULT_INDICADORES[stateKey].rrToProp,
            propToVenda: db.propToVenda || DEFAULT_INDICADORES[stateKey].propToVenda,
          };
        }
      }
    }
    return result;
  }, [getIndicatorsMap]);

  // Helper: Get metas from database for a BU (original values only)
  const getMetasFromDb = (bu: BuType): Record<string, number> | null => {
    const buMetas = metas.filter(m => m.bu === bu);
    if (buMetas.length === 0) return null;
    
    const hasValues = buMetas.some(m => 
      Number(m.faturamento) > 0 || Number(m.pontual) > 0
    );
    if (!hasValues) return null;
    
    const result: Record<string, number> = {};
    const isPontualOnly = isPontualOnlyBU(bu);
    buMetas.forEach(m => {
      result[m.month] = isPontualOnly 
        ? (Number(m.pontual) || 0)
        : (Number(m.faturamento) || 0);
    });
    return result;
  };

  // Calculate Modelo Atual monthly targets - prioritize DB
  const metasMensaisModeloAtual = useMemo(() => {
    const dbMetas = getMetasFromDb('modelo_atual');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return distributeQuarterlyToMonthly(metasTrimestrais);
  }, [metas]);
  // Calculate MRR dynamics for Modelo Atual
  const mrrDynamicRaw = useMemo(() => {
    return calculateMrrAndRevenueToSell(
      mrrInicial, 
      churnMensal, 
      retencaoVendas,
      metasMensaisModeloAtual,
      indicadoresPorBU.modeloAtual.ticketMedio,
      valorVenderInicial
    );
  }, [metasMensaisModeloAtual, mrrInicial, valorVenderInicial]);

  // GAP RULE (Modelo Atual only): para cada mês com Oxy real disponível,
  // gap = mrr_chain_projetado - mrr_oxy_real. O total dos déficits (gap > 0)
  // é redirecionado para 'a vender' de Dezembro, preservando a meta anual.
  const mrrDynamic = useMemo(() => {
    const adjusted = {
      mrrPorMes: { ...mrrDynamicRaw.mrrPorMes },
      vendasPorMes: { ...mrrDynamicRaw.vendasPorMes },
      revenueToSell: { ...mrrDynamicRaw.revenueToSell },
    };
    let gapTotal = 0;
    const gapPorMes: Record<string, number> = {};
    months.forEach(m => {
      const oxy = mrrBaseRealPorMes[m];
      if (!oxy || oxy <= 0) return;
      const projetado = mrrDynamicRaw.mrrPorMes[m] || 0;
      const gap = projetado - oxy;
      gapPorMes[m] = gap;
      if (gap > 0) gapTotal += gap;
    });
    if (gapTotal > 0) {
      const ticket = indicadoresPorBU.modeloAtual.ticketMedio || 17000;
      adjusted.revenueToSell['Dez'] = (adjusted.revenueToSell['Dez'] || 0) + gapTotal;
      adjusted.vendasPorMes['Dez'] = Math.round(adjusted.revenueToSell['Dez'] / ticket);
    }
    console.log('[GapMRR ModeloAtual]', {
      gapPorMes,
      gapTotal,
      dezAVenderOriginal: mrrDynamicRaw.revenueToSell['Dez'],
      dezAVenderAjustado: adjusted.revenueToSell['Dez'],
    });
    return adjusted;
  }, [mrrDynamicRaw, mrrBaseRealPorMes]);

  // Calculate monthly values for other BUs - prioritize DB
  const o2TaxMonthly = useMemo(() => {
    const dbMetas = getMetasFromDb('o2_tax');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateMonthlyValuesSmooth(quarterlyTotalsOutrasBUs.o2Tax, 120000);
  }, [metas]);
  
  const oxyHackerMonthly = useMemo(() => {
    const dbMetas = getMetasFromDb('oxy_hacker');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateFromUnits(oxyHackerUnits, 54000);
  }, [metas]);
  
  const franquiaMonthly = useMemo(() => {
    const dbMetas = getMetasFromDb('franquia');
    if (dbMetas && Object.values(dbMetas).some(v => v > 0)) {
      return dbMetas;
    }
    return calculateFromUnits(franquiaUnits, 140000);
  }, [metas]);

  // Calculate funnel data via reverse funnel (used as fallback and for initial seed)
  const modeloAtualFunnelCalculated = useMemo(() => 
    calculateReverseFunnel(
      mrrDynamic.revenueToSell, 
      indicadoresPorBU.modeloAtual, 
      mrrDynamic.mrrPorMes, 
      metasMensaisModeloAtual,
      indicadoresPorBU.modeloAtual.cpv
    ),
    [mrrDynamic, metasMensaisModeloAtual]
  );
  
  const o2TaxFunnel = useMemo(() => 
    calculateReverseFunnel(o2TaxMonthly, indicadoresPorBU.o2Tax, null, null, indicadoresPorBU.o2Tax.cpv, 10000),
    [o2TaxMonthly]
  );
  
  const oxyHackerFunnel = useMemo(() => 
    calculateReverseFunnel(oxyHackerMonthly, indicadoresPorBU.oxyHacker, null, null, indicadoresPorBU.oxyHacker.cpv, 10000),
    [oxyHackerMonthly]
  );
  
  const franquiaFunnel = useMemo(() => 
    calculateReverseFunnel(franquiaMonthly, indicadoresPorBU.franquia, null, null, indicadoresPorBU.franquia.cpv, 10000),
    [franquiaMonthly]
  );

  // Build the final Modelo Atual funnel: use fixed DB values for funnel stages if available,
  // otherwise use the calculated reverse funnel values.
  // When is_locked = true, snapshot wins for faturamentoMeta/Vender/investimento.
  // For mrrBase displayed: Oxy truth (mrr_base_monthly) ALWAYS wins when present,
  // regardless of lock — the lock only protects the PLAN, not the real number shown.
  const modeloAtualFunnel = useMemo(() => {
    const hasFixedFunnel = hasFunnelForBU('modelo_atual');
    const monthlyConfig = getIndicatorsForBU('modelo_atual');

    // Helper: aplica o "driver por investimento" para um mês com investimento_planejado > 0.
    // vendas = round(invest / CPV); o restante cai pelas taxas mensais (com leadToMql do default).
    const applyInvestmentDriver = (calc: typeof modeloAtualFunnelCalculated[number]) => {
      const cfg = monthlyConfig[calc.month];
      const investPlan = Number(cfg?.investimentoPlanejado || 0);
      const cpvMes = Number(cfg?.cpv || 0);
      if (investPlan <= 0 || cpvMes <= 0) return calc;

      const propToVenda = Number(cfg?.propToVenda) || indicadoresPorBU.modeloAtual.propToVenda;
      const rrToProp = Number(cfg?.rrToProp) || indicadoresPorBU.modeloAtual.rrToProp;
      const rmToRr = Number(cfg?.rmToRr) || indicadoresPorBU.modeloAtual.rmToRr;
      const mqlToRm = Number(cfg?.mqlToRm) || indicadoresPorBU.modeloAtual.mqlToRm;
      const leadToMql = indicadoresPorBU.modeloAtual.leadToMql;

      const vendas = Math.round(investPlan / cpvMes);
      const propostas = Math.round(vendas / propToVenda);
      const rrs = Math.round(propostas / rrToProp);
      const rms = Math.round(rrs / rmToRr);
      const mqls = Math.round(rms / mqlToRm);
      const leads = Math.round(mqls / leadToMql);

      return {
        ...calc,
        vendas,
        propostas,
        rrs,
        rms,
        mqls,
        leads,
        investimento: investPlan,
      };
    };

    const base = !hasFixedFunnel ? modeloAtualFunnelCalculated.map(applyInvestmentDriver) : modeloAtualFunnelCalculated.map(calc => {
      const fixed = getFunnelForBU('modelo_atual').find(f => f.month === calc.month);
      if (!fixed) return applyInvestmentDriver(calc);

      // Only locked months use the snapshot (quantities + monetary).
      // Unlocked months: aplica driver por investimento (se houver) e cai no calc ao vivo.
      if (fixed.is_locked) {
        const fatMeta = Number(fixed.faturamento_meta) || 0;
        const fatVender = Number(fixed.faturamento_vender) || 0;
        const invest = Number(fixed.investimento) || 0;
        return {
          ...calc,
          leads: fixed.leads,
          mqls: fixed.mqls,
          rms: fixed.rms,
          rrs: fixed.rrs,
          propostas: fixed.propostas,
          vendas: fixed.vendas,
          ...(fatMeta > 0 ? { faturamentoMeta: fatMeta } : {}),
          ...(fatVender > 0 ? { faturamentoVender: fatVender } : {}),
          ...(invest > 0 ? { investimento: invest } : {}),
        };
      }

      return applyInvestmentDriver(calc);
    });

    // mrrBase agora representa SEMPRE o projetado (chain). O real (Oxy) fica
    // separado em mrrBaseRealPorMes e é exibido como "Real (Oxy)" no badge de gap
    // por mês em MediaInvestmentTab. O saldo (projetado − real) é redirecionado
    // para o "a vender" de Dezembro pela regra de gap acima.
    return base;
  }, [modeloAtualFunnelCalculated, funnelMetas, mrrBaseRealPorMes, getIndicatorsForBU, indicadoresPorBU]);

  // Auto-seed funnel_metas on first load if table is empty
  // NEVER overwrite past/current months — only seed future months that don't exist yet
  useEffect(() => {
    if (isLoadingFunnel || isLoadingMetas || hasSeeded.current) return;
    if (hasFunnelForBU('modelo_atual')) return;
    if (modeloAtualFunnelCalculated.length === 0) return;

    hasSeeded.current = true;
    const now = new Date();
    const currentMonthIdx = now.getMonth(); // 0-based (Apr=3)
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    // Only seed months AFTER the current month (Mai onwards if we're in Abr)
    const seedData = modeloAtualFunnelCalculated
      .filter(d => {
        const monthIdx = MONTHS.indexOf(d.month);
        return monthIdx > currentMonthIdx; // strictly future months only
      })
      .map(d => ({
        bu: 'modelo_atual',
        month: d.month,
        year: 2026,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
      }));

    if (seedData.length > 0) {
      bulkUpsert.mutate(seedData);
    }
  }, [isLoadingFunnel, isLoadingMetas, modeloAtualFunnelCalculated, funnelMetas]);

  // Auto-lock months that have already started (startOfMonth <= today).
  // Captures a snapshot of the live Plan Growth values for ALL 4 BUs and sets is_locked=true.
  // Runs once per session — guarded by hasAutoLocked.
  useEffect(() => {
    if (isLoadingFunnel || isLoadingMetas || isLoadingIndicators || isLoadingMrrBase) return;
    if (hasAutoLocked.current) return;
    // Garantir que o MRR Base real (Oxy) chegou — sem ele o cálculo usa hardcode 700k e gera snapshot errado.
    if (!mrrBaseRealPorMes['Jan'] || mrrBaseRealPorMes['Jan'] <= 0) return;
    if (
      modeloAtualFunnel.length === 0 ||
      o2TaxFunnel.length === 0 ||
      oxyHackerFunnel.length === 0 ||
      franquiaFunnel.length === 0
    ) return;

    const PLAN_YEAR = 2026;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIdx = today.getMonth(); // 0-based

    // Only auto-lock for the planning year
    if (currentYear < PLAN_YEAR) return;

    // For year > PLAN_YEAR, lock everything; for year == PLAN_YEAR, lock months 0..currentMonthIdx
    const maxLockableIdx = currentYear > PLAN_YEAR ? 11 : currentMonthIdx;

    const isAlreadyLocked = (bu: string, month: string) =>
      funnelMetas.some(m => m.bu === bu && m.month === month && m.year === PLAN_YEAR && m.is_locked === true);

    // Skip auto-lock for rows explicitly zeroed by admin (investimento=0 + is_locked=false).
    // This is the "intentionally cleared" signal — the app must NOT re-lock and overwrite
    // them with computed values. Used for Oxy Hacker / O2 TAX zero-investment plan.
    const isExplicitlyZeroed = (bu: string, month: string) =>
      funnelMetas.some(
        m =>
          m.bu === bu &&
          m.month === month &&
          m.year === PLAN_YEAR &&
          m.is_locked === false &&
          Number(m.investimento || 0) === 0
      );

    type FunnelRow = typeof modeloAtualFunnelCalculated[number];
    const buSources: Array<{ bu: string; rows: FunnelRow[] }> = [
      { bu: 'modelo_atual', rows: modeloAtualFunnel },
      { bu: 'o2_tax', rows: o2TaxFunnel },
      { bu: 'oxy_hacker', rows: oxyHackerFunnel },
      { bu: 'franquia', rows: franquiaFunnel },
    ];

    const toLock: Array<Parameters<typeof lockMonths.mutate>[0][number]> = [];
    for (const { bu, rows } of buSources) {
      for (let idx = 0; idx <= maxLockableIdx; idx++) {
        const monthName = months[idx];
        if (isAlreadyLocked(bu, monthName)) continue;
        if (isExplicitlyZeroed(bu, monthName)) continue;
        const row = rows.find(r => r.month === monthName);
        if (!row) continue;
        toLock.push({
          bu,
          month: monthName,
          year: PLAN_YEAR,
          leads: row.leads,
          mqls: row.mqls,
          rms: row.rms,
          rrs: row.rrs,
          propostas: row.propostas,
          vendas: row.vendas,
          faturamento_meta: row.faturamentoMeta || 0,
          faturamento_vender: row.faturamentoVender || 0,
          mrr_base_planejamento: row.mrrBase || 0,
          investimento: row.investimento || 0,
        });
      }
    }

    if (toLock.length > 0) {
      hasAutoLocked.current = true;
      console.log('[AutoLock] Locking months that already started:', toLock.map(t => `${t.bu}/${t.month}`));
      lockMonths.mutate(toLock);
    } else {
      hasAutoLocked.current = true;
    }
  }, [
    isLoadingFunnel,
    isLoadingMetas,
    isLoadingIndicators,
    isLoadingMrrBase,
    mrrBaseRealPorMes,
    funnelMetas,
    modeloAtualFunnel,
    o2TaxFunnel,
    oxyHackerFunnel,
    franquiaFunnel,
  ]);

  // Publish data to context whenever funnel data changes
  useEffect(() => {
    
    setMetasPorBU({
      modelo_atual: Object.fromEntries(
        modeloAtualFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      o2_tax: Object.fromEntries(
        o2TaxFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      oxy_hacker: Object.fromEntries(
        oxyHackerFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
      franquia: Object.fromEntries(
        franquiaFunnel.map(d => [d.month, d.faturamentoMeta])
      ),
    });
    
    // Use fixed operational targets for external BUs instead of reverse funnel calculations
    const o2TaxOperationalMetas = distributeAnnualToMonthly(externalBUAnnualMetas.o2Tax);
    const oxyHackerOperationalMetas = distributeAnnualToMonthly(externalBUAnnualMetas.oxyHacker);
    const franquiaOperationalMetas = distributeAnnualToMonthly(externalBUAnnualMetas.franquia);
    
    setFunnelData({
      modeloAtual: modeloAtualFunnel.map(d => ({
        month: d.month,
        leads: Math.round(d.leads),
        mqls: Math.round(d.mqls),
        rms: Math.round(d.rms),
        rrs: Math.round(d.rrs),
        propostas: Math.round(d.propostas),
        vendas: Math.round(d.vendas),
        investimento: Math.round(d.investimento),
        faturamento: Math.round(d.faturamentoVender),
      })),
      o2Tax: o2TaxOperationalMetas.map((metas, index) => ({
        month: metas.month,
        leads: Math.round(metas.mqls / indicadoresPorBU.o2Tax.leadToMql),
        mqls: metas.mqls,
        rms: metas.rms,
        rrs: metas.rrs,
        propostas: metas.propostas,
        vendas: metas.vendas,
        investimento: Math.round(o2TaxFunnel[index]?.investimento || 0),
        faturamento: Math.round(o2TaxMonthly[metas.month] || 0),
      })),
      oxyHacker: oxyHackerOperationalMetas.map((metas, index) => ({
        month: metas.month,
        leads: Math.round(metas.mqls / indicadoresPorBU.oxyHacker.leadToMql),
        mqls: metas.mqls,
        rms: metas.rms,
        rrs: metas.rrs,
        propostas: metas.propostas,
        vendas: metas.vendas,
        investimento: Math.round(oxyHackerFunnel[index]?.investimento || 0),
        faturamento: Math.round(oxyHackerMonthly[metas.month] || 0),
      })),
      franquia: franquiaOperationalMetas.map((metas, index) => ({
        month: metas.month,
        leads: Math.round(metas.mqls / indicadoresPorBU.franquia.leadToMql),
        mqls: metas.mqls,
        rms: metas.rms,
        rrs: metas.rrs,
        propostas: metas.propostas,
        vendas: metas.vendas,
        investimento: Math.round(franquiaFunnel[index]?.investimento || 0),
        faturamento: Math.round(franquiaMonthly[metas.month] || 0),
      })),
    });
  }, [modeloAtualFunnel, o2TaxFunnel, oxyHackerFunnel, franquiaFunnel]);

  return {
    modeloAtualFunnel,
    o2TaxFunnel,
    oxyHackerFunnel,
    franquiaFunnel,
  };
}
