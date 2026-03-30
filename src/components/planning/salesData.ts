// Shared sales data and utilities for Planning 2026

export const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const quarterMonths = {
  Q1: ["Jan", "Fev", "Mar"],
  Q2: ["Abr", "Mai", "Jun"],
  Q3: ["Jul", "Ago", "Set"],
  Q4: ["Out", "Nov", "Dez"],
};

// Quarterly totals from Goals2026Tab
export const quarterlyTotals = {
  modeloAtual: { Q1: 3750000, Q2: 4500000, Q3: 6000000, Q4: 8000000 },
  o2Tax: { Q1: 412224, Q2: 587220.48, Q3: 781590.46, Q4: 1040296.90 },
  oxyHacker: { Q1: 5 * 54000, Q2: 15 * 54000, Q3: 30 * 54000, Q4: 50 * 54000 },
  franquia: { Q1: 2 * 140000, Q2: 3 * 140000, Q3: 6 * 140000, Q4: 9 * 140000 },
};

// BU configurations (original - used in other tabs)
export type BUKey = 'modelo_atual' | 'o2_tax' | 'oxy_hacker' | 'franquia';

export interface BUConfig {
  key: BUKey;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
}

export const buConfigs: BUConfig[] = [
  { key: 'modelo_atual', label: 'Modelo Atual', color: 'hsl(var(--primary))', colorClass: 'text-primary', bgClass: 'bg-primary' },
  { key: 'o2_tax', label: 'O2 TAX', color: 'hsl(var(--warning))', colorClass: 'text-warning', bgClass: 'bg-warning' },
  { key: 'oxy_hacker', label: 'Oxy Hacker', color: 'hsl(var(--accent))', colorClass: 'text-accent', bgClass: 'bg-accent' },
  { key: 'franquia', label: 'Franquia', color: 'hsl(var(--franquia))', colorClass: 'text-franquia', bgClass: 'bg-franquia' },
];

// Dashboard-specific BU configurations (Oxy Hacker + Franquia = Expansão O2)
export type DashboardBUKey = 'modelo_atual' | 'o2_tax' | 'expansao_o2';

export interface DashboardBUConfig {
  key: DashboardBUKey;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
}

export const dashboardBuConfigs: DashboardBUConfig[] = [
  { key: 'modelo_atual', label: 'Modelo Atual', color: 'hsl(var(--primary))', colorClass: 'text-primary', bgClass: 'bg-primary' },
  { key: 'o2_tax', label: 'O2 TAX', color: 'hsl(var(--warning))', colorClass: 'text-warning', bgClass: 'bg-warning' },
  { key: 'expansao_o2', label: 'Expansão O2', color: 'hsl(var(--accent))', colorClass: 'text-accent', bgClass: 'bg-accent' },
];

// Calculate monthly values with smooth growth
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

// Oxy Hacker: units distribution
const oxyHackerUnits: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 2,
  Abr: 5, Mai: 5, Jun: 5,
  Jul: 10, Ago: 10, Set: 10,
  Out: 15, Nov: 18, Dez: 17,
};
const OXY_HACKER_TICKET = 54000;

// Franquia: units distribution
const franquiaUnits: Record<string, number> = {
  Jan: 0, Fev: 1, Mar: 1,
  Abr: 1, Mai: 1, Jun: 1,
  Jul: 2, Ago: 2, Set: 2,
  Out: 3, Nov: 3, Dez: 3,
};
const FRANQUIA_TICKET = 140000;

function calculateFromUnits(units: Record<string, number>, ticketValue: number): Record<string, number> {
  const result: Record<string, number> = {};
  months.forEach(month => {
    result[month] = units[month] * ticketValue;
  });
  return result;
}

// Calculate projected values for each BU
export const projectedData = {
  modelo_atual: calculateMonthlyValuesSmooth(quarterlyTotals.modeloAtual, 1100000),
  o2_tax: calculateMonthlyValuesSmooth(quarterlyTotals.o2Tax, 120000),
  oxy_hacker: calculateFromUnits(oxyHackerUnits, OXY_HACKER_TICKET),
  franquia: calculateFromUnits(franquiaUnits, FRANQUIA_TICKET),
};

// Dashboard-specific projected data (aggregates Oxy Hacker + Franquia into Expansão O2)
export const dashboardProjectedData: Record<DashboardBUKey, Record<string, number>> = {
  modelo_atual: projectedData.modelo_atual,
  o2_tax: projectedData.o2_tax,
  expansao_o2: months.reduce((acc, month) => {
    acc[month] = projectedData.oxy_hacker[month] + projectedData.franquia[month];
    return acc;
  }, {} as Record<string, number>),
};

// Calculate totals
export function calculateBUTotal(buKey: BUKey): number {
  return Object.values(projectedData[buKey]).reduce((a, b) => a + b, 0);
}

export function calculateDashboardBUTotal(buKey: DashboardBUKey): number {
  return Object.values(dashboardProjectedData[buKey]).reduce((a, b) => a + b, 0);
}

export function calculateGrandTotal(): number {
  return buConfigs.reduce((sum, bu) => sum + calculateBUTotal(bu.key), 0);
}

export function calculateDashboardGrandTotal(): number {
  return dashboardBuConfigs.reduce((sum, bu) => sum + calculateDashboardBUTotal(bu.key), 0);
}

// Aggregate realized data for dashboard (Oxy Hacker + Franquia = Expansão O2)
export function aggregateRealizedForDashboard(
  realizedByBU: Record<string, Record<string, number>>
): Record<DashboardBUKey, Record<string, number>> {
  const result: Record<DashboardBUKey, Record<string, number>> = {
    modelo_atual: realizedByBU.modelo_atual || {},
    o2_tax: realizedByBU.o2_tax || {},
    expansao_o2: {},
  };

  months.forEach((month) => {
    result.expansao_o2[month] = 
      (realizedByBU.oxy_hacker?.[month] || 0) + 
      (realizedByBU.franquia?.[month] || 0);
  });

  return result;
}

// Formatting utilities
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

// Get quarter for a month
export function getQuarter(month: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (["Jan", "Fev", "Mar"].includes(month)) return "Q1";
  if (["Abr", "Mai", "Jun"].includes(month)) return "Q2";
  if (["Jul", "Ago", "Set"].includes(month)) return "Q3";
  return "Q4";
}
