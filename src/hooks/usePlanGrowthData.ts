import { useMemo, useEffect } from "react";
import { useMediaMetas } from "@/contexts/MediaMetasContext";
import { useMonetaryMetas, BuType, isPontualOnlyBU } from "./useMonetaryMetas";

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

const indicadoresPorBU: Record<string, BUIndicators> = {
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
  
  // Default values (same as MediaInvestmentTab)
  const mrrInicial = 700000;
  const valorVenderInicial = 400000;
  const churnMensal = 0.06;
  const retencaoVendas = 0.25;

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
  const mrrDynamic = useMemo(() => {
    return calculateMrrAndRevenueToSell(
      mrrInicial, 
      churnMensal, 
      retencaoVendas,
      metasMensaisModeloAtual,
      indicadoresPorBU.modeloAtual.ticketMedio,
      valorVenderInicial
    );
  }, [metasMensaisModeloAtual]);

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

  // Calculate funnel data for each BU
  const modeloAtualFunnel = useMemo(() => 
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

  // Publish data to context whenever funnel data changes
  // (allows Admin Metas edits to propagate to Controle Metas)
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
      // Use operational targets for O2 TAX (42 MQL/mo, 15 RM/mo, etc.)
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
      // Use operational targets for Oxy Hacker (25 MQL/mo, 10 RM/mo, etc.)
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
      // Use operational targets for Franquia (30 MQL/mo, 12 RM/mo, etc.)
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
