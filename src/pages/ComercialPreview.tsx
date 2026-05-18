import { useState, Fragment } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, GitBranch, Users, Briefcase, TrendingDown,
  Info, ArrowUpRight, ArrowDownRight, AlertTriangle, Flame, Thermometer, Snowflake,
  Filter, Calendar, RefreshCw, ChevronDown, Lightbulb, Maximize2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell
} from "recharts";

/**
 * MOCK ESTÁTICO v3 — Indicadores Comerciais com brand O2 aplicado.
 * Dark mode, accent Lima 400 (#63F161), tipografia editorial (Anton/Montserrat/JetBrains Mono).
 * Gráficos reais com Recharts substituindo todos os placeholders.
 */

// ───────────── Brand O2 tokens (escopados) ─────────────
const O2 = {
  bg: "#3A3A3A",
  surface: "#2E2E2E",
  elev2: "#252525",
  elev3: "#1F1F1F",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  fg: "#FAFAFA",
  muted: "#C4C4C4",
  subtle: "#9A9A9A",
  lima: "#63F161",
  limaSoft: "rgba(99,241,97,0.16)",
  limaLine: "rgba(99,241,97,0.4)",
  amber: "#F5B342",
  red: "#FF6B6B",
  blue: "#5BC0EB",
};

const FONT_DISPLAY = "'Anton', 'Tusker Grotesk', 'Bebas Neue', Impact, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
const FONT_BODY = "'Montserrat', system-ui, -apple-system, sans-serif";

// ───────────── style block escopado ao .o2-preview ─────────────
function O2StyleScope() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .o2-preview {
          --o2-bg: ${O2.bg};
          --o2-surface: ${O2.surface};
          --o2-elev2: ${O2.elev2};
          --o2-elev3: ${O2.elev3};
          --o2-line: ${O2.line};
          --o2-line-strong: ${O2.lineStrong};
          --o2-fg: ${O2.fg};
          --o2-muted: ${O2.muted};
          --o2-subtle: ${O2.subtle};
          --o2-lima: ${O2.lima};
          --o2-lima-soft: ${O2.limaSoft};
          background: var(--o2-bg);
          color: var(--o2-fg);
          font-family: ${FONT_BODY};
          font-weight: 400;
          letter-spacing: 0;
          min-height: 100vh;
        }
        .o2-preview * { border-color: var(--o2-line); }
        .o2-preview .o2-display {
          font-family: ${FONT_DISPLAY};
          text-transform: uppercase;
          line-height: 0.96;
          letter-spacing: 0.01em;
          font-weight: 700;
          color: var(--o2-fg);
        }
        .o2-preview .o2-mono {
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 500;
          font-size: 10px;
          color: var(--o2-muted);
        }
        .o2-preview .o2-eyebrow {
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-weight: 600;
          font-size: 10px;
          color: var(--o2-lima);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border: 1px solid var(--o2-lima);
          border-radius: 999px;
          background: var(--o2-lima-soft);
        }
        .o2-preview [class*="rounded-lg"],
        .o2-preview [class*="rounded-md"] { border-radius: 12px; }

        /* Card overrides */
        .o2-preview [data-slot="card"],
        .o2-preview .o2-card {
          background: var(--o2-surface);
          border: 1px solid var(--o2-line);
          border-radius: 20px;
          color: var(--o2-fg);
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.18);
        }
        .o2-preview [data-slot="card-title"] {
          font-family: ${FONT_BODY};
          font-weight: 600;
          color: var(--o2-fg);
          letter-spacing: 0.01em;
        }
        .o2-preview .text-muted-foreground { color: var(--o2-muted) !important; }
        .o2-preview .text-foreground { color: var(--o2-fg) !important; }
        .o2-preview h1,
        .o2-preview h2,
        .o2-preview h3 { color: var(--o2-fg); }

        /* Badge override */
        .o2-preview [data-slot="badge"] {
          background: rgba(255,255,255,0.05);
          color: var(--o2-muted);
          border: 1px solid var(--o2-line-strong);
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 500;
          border-radius: 999px;
        }
        .o2-preview .o2-badge-lima {
          background: var(--o2-lima-soft) !important;
          color: var(--o2-lima) !important;
          border-color: ${O2.limaLine} !important;
        }

        /* Buttons */
        .o2-preview [data-slot="button"] {
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 500;
          font-size: 11px;
          border-radius: 999px;
          transition: all 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .o2-preview [data-slot="button"][data-variant="outline"],
        .o2-preview button[class*="border"] {
          background: transparent;
          border: 1px solid var(--o2-line-strong);
          color: var(--o2-fg);
        }
        .o2-preview [data-slot="button"][data-variant="default"] {
          background: var(--o2-lima);
          color: #0A0A0A;
        }
        .o2-preview [data-slot="button"]:hover {
          border-color: var(--o2-lima);
          color: var(--o2-lima);
        }

        /* Tabs */
        .o2-preview [data-slot="tabs-list"] {
          background: var(--o2-elev2);
          border: 1px solid var(--o2-line);
          padding: 4px;
          border-radius: 14px;
        }
        .o2-preview [data-slot="tabs-trigger"] {
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10.5px;
          font-weight: 500;
          color: var(--o2-muted);
          border-radius: 10px;
          position: relative;
          transition: all 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .o2-preview [data-slot="tabs-trigger"][data-state="active"] {
          background: var(--o2-elev3);
          color: var(--o2-lima);
          box-shadow: inset 0 -2px 0 var(--o2-lima);
        }

        /* Inputs / tables / dividers */
        .o2-preview table thead th {
          font-family: ${FONT_MONO};
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 10px;
          color: var(--o2-subtle);
          font-weight: 500;
        }
        .o2-preview table tbody td { color: var(--o2-fg); font-size: 12.5px; }
        .o2-preview table tr { border-color: var(--o2-line) !important; }
        .o2-preview table tbody tr:hover { background: rgba(99,241,97,0.04); }

        /* KPI big number */
        .o2-preview .o2-kpi {
          font-family: ${FONT_DISPLAY};
          font-weight: 700;
          font-size: 38px;
          line-height: 0.96;
          letter-spacing: 0.01em;
          color: var(--o2-fg);
        }
        .o2-preview .o2-kpi-sm {
          font-family: ${FONT_DISPLAY};
          font-weight: 700;
          font-size: 30px;
          line-height: 0.96;
          color: var(--o2-fg);
        }

        /* Temperature card gradients */
        .o2-preview .o2-temp-hot {
          background: linear-gradient(140deg, ${O2.surface} 0%, rgba(255,107,107,0.08) 100%);
          border: 1px solid;
          border-image: linear-gradient(140deg, ${O2.lineStrong}, rgba(255,107,107,0.5)) 1;
          border-radius: 20px;
        }
        .o2-preview .o2-temp-warm {
          background: linear-gradient(140deg, ${O2.surface} 0%, rgba(245,179,66,0.08) 100%);
          border: 1px solid;
          border-image: linear-gradient(140deg, ${O2.lineStrong}, rgba(245,179,66,0.5)) 1;
          border-radius: 20px;
        }
        .o2-preview .o2-temp-cold {
          background: linear-gradient(140deg, ${O2.surface} 0%, rgba(91,192,235,0.08) 100%);
          border: 1px solid;
          border-image: linear-gradient(140deg, ${O2.lineStrong}, rgba(91,192,235,0.5)) 1;
          border-radius: 20px;
        }

        /* Recharts text */
        .o2-preview .recharts-cartesian-axis-tick text,
        .o2-preview .recharts-text {
          fill: ${O2.subtle};
          font-family: ${FONT_MONO};
          font-size: 10px;
          letter-spacing: 0.1em;
        }
        .o2-preview .recharts-cartesian-grid-horizontal line,
        .o2-preview .recharts-cartesian-grid-vertical line {
          stroke: rgba(255,255,255,0.06);
        }
        .o2-preview .recharts-default-tooltip {
          background: ${O2.elev3} !important;
          border: 1px solid ${O2.lineStrong} !important;
          border-radius: 12px !important;
          color: ${O2.fg} !important;
        }

        /* Heatmap cell */
        .o2-preview .o2-heat {
          border-radius: 6px;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ${FONT_MONO};
          font-size: 10px;
          color: rgba(255,255,255,0.85);
        }
      `}</style>
    </>
  );
}

// ───────────── chart helpers ─────────────
const tooltipStyle = {
  background: O2.elev3,
  border: `1px solid ${O2.lineStrong}`,
  borderRadius: 12,
  color: O2.fg,
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const labelStyle = { color: O2.muted, fontFamily: FONT_MONO, fontSize: 10 };

// ───────────── visual helpers ─────────────
function MockNumber({ value, delta, meta, label, hint, accent }: { value: string; delta?: string; meta?: string; label: string; hint?: string; accent?: string }) {
  const isPositive = delta?.startsWith('+');
  const isNegative = delta?.startsWith('-');
  return (
    <Card className={accent}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="o2-mono">{label}</span>
          <Info className="h-3 w-3 ml-auto opacity-50 cursor-help" />
        </div>
        <p className="o2-kpi-sm">{value}</p>
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span
              className="text-[10px] flex items-center gap-0.5"
              style={{
                fontFamily: FONT_MONO,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isPositive ? O2.lima : isNegative ? O2.red : O2.muted,
              }}
            >
              {isPositive && <ArrowUpRight className="h-3 w-3" />}
              {isNegative && <ArrowDownRight className="h-3 w-3" />}
              {delta} vs sem. ant.
            </span>
          )}
          {meta && <span className="o2-mono" style={{ fontSize: 9 }}>meta: {meta}</span>}
        </div>
        {hint && <p className="text-[10.5px] mt-2" style={{ color: O2.subtle }}>{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, hint, children, accent }: { title: string; hint?: string; children: React.ReactNode; accent?: string }) {
  return (
    <Card className={accent}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className="o2-badge-lima text-[9px]">mock</Badge>
        </div>
        {hint && <p className="text-[11px]" style={{ color: O2.subtle }}>{hint}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MiniTable({ title, rows, cols, hint, accent }: { title: string; rows: (string|number)[][]; cols: string[]; hint?: string; accent?: string }) {
  return (
    <Card className={accent}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="outline" className="o2-badge-lima text-[9px]">mock</Badge>
        </div>
        {hint && <p className="text-[11px]" style={{ color: O2.subtle }}>{hint}</p>}
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${O2.line}` }}>
              {cols.map((c, i) => <th key={i} className={`py-2 px-2 text-left ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${O2.line}` }}>
                {r.map((cell, j) => <td key={j} className={`py-2 px-2 ${j > 0 ? 'text-right tabular-nums' : ''}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AlertCard({ tone, title, body }: { tone: 'critico' | 'alto' | 'info'; title: string; body: string }) {
  const palette = {
    critico: { bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.35)", fg: O2.red },
    alto: { bg: "rgba(245,179,66,0.08)", border: "rgba(245,179,66,0.35)", fg: O2.amber },
    info: { bg: "rgba(91,192,235,0.08)", border: "rgba(91,192,235,0.35)", fg: O2.blue },
  }[tone];
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-lg border"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: palette.fg }} />
      <div className="flex-1 text-xs">
        <div className="font-semibold mb-0.5" style={{ color: palette.fg }}>{title}</div>
        <div style={{ color: O2.muted }}>{body}</div>
      </div>
      <Button variant="ghost" size="sm" className="h-6 text-[10px]">Ver</Button>
    </div>
  );
}

// ───────────── mock data ─────────────
const paceData = Array.from({ length: 14 }, (_, i) => {
  const d = i + 1;
  return { dia: `D${d}`, realizado: Math.round(d * 1.0 + (i > 6 ? -0.5 * (i - 6) : 0)), meta: Math.round(d * 2) };
});

const semanaCompData = [
  { fase: "MQL", S1: 78, S2: 64 },
  { fase: "RM", S1: 32, S2: 36 },
  { fase: "RR", S1: 11, S2: 9 },
  { fase: "Prop", S1: 14, S2: 16 },
  { fase: "Venda", S1: 4, S2: 4 },
];

const funilModeloAtual = [
  { name: "MQL", value: 142, fill: O2.lima },
  { name: "RM", value: 68, fill: "#A8F299" },
  { name: "RR", value: 54, fill: O2.amber },
  { name: "Proposta", value: 30, fill: "#FF9B5B" },
  { name: "Venda", value: 8, fill: O2.red },
];
const funilExpansao = [
  { name: "MQL", value: 58, fill: O2.lima },
  { name: "RM", value: 22, fill: "#A8F299" },
  { name: "RR", value: 18, fill: O2.amber },
  { name: "Proposta", value: 10, fill: "#FF9B5B" },
  { name: "Venda", value: 3, fill: O2.red },
];

const convTrend = Array.from({ length: 12 }, (_, i) => ({
  sem: `S${i + 1}`,
  "MQL→RM": 60 + Math.round(Math.sin(i / 2) * 6 + i * 0.4),
  "RM→RR": 76 + Math.round(Math.cos(i / 2.4) * 5),
  "RR→Prop": 52 + Math.round(Math.sin(i / 1.6) * 7),
  "Prop→Venda": 28 - Math.round(i * 0.5),
}));

const sankeyBar = [
  { fase: "MQL", Avança: 68, Loss: 74 },
  { fase: "RM", Avança: 54, Loss: 14 },
  { fase: "RR", Avança: 30, Loss: 24 },
  { fase: "Proposta", Avança: 8, Loss: 22 },
];

const heatSDR = ["Carlos", "Bruna", "Erica", "Daniel", "Pedro"];
const heatDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const heatValues = [
  [18, 14, 16, 12, 10, 4, 1],
  [15, 17, 13, 14, 12, 3, 0],
  [8, 6, 9, 7, 5, 1, 0],
  [4, 3, 2, 5, 3, 0, 0],
  [12, 11, 10, 13, 9, 2, 1],
];

const winRateCloser = [
  { closer: "Pedro Albite", "Até 50k": 38, "50–200k": 32, "200k+": 22 },
  { closer: "Bruna", "Até 50k": 30, "50–200k": 28, "200k+": 18 },
  { closer: "Daniel T.", "Até 50k": 22, "50–200k": 12, "200k+": 6 },
  { closer: "Thiago", "Até 50k": 25, "50–200k": 18, "200k+": 8 },
];

const perdaCross = {
  motivos: ["Não viu valor", "Sem orçamento", "Concorrência", "Não respondeu", "Outros"],
  faixas: ["Até 50k", "50–200k", "200k+"],
  values: [
    [4, 3, 2],
    [3, 2, 1],
    [1, 1, 2],
    [2, 1, 0],
    [1, 0, 0],
  ],
};
const perdaPorFase = [
  { fase: "MQL", perdas: 32 },
  { fase: "RM", perdas: 18 },
  { fase: "RR", perdas: 12 },
  { fase: "Proposta", perdas: 8 },
];
const tendenciaMotivos = Array.from({ length: 6 }, (_, i) => ({
  mes: ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"][i],
  "Não viu valor": 5 + i,
  "Sem orçamento": 4 + Math.round(i * 0.7),
  "Concorrência": 2 + Math.round(i * 0.9),
  "Não respondeu": 3 + Math.round(Math.sin(i) * 1.5),
  "Outros": 2,
}));

// ───────────── Sub-páginas ─────────────

function VisaoExecutiva() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MockNumber label="Pace Vendas (Maio)" value="14/28" delta="-12%" meta="28" hint="50% do mês, 67% transcorrido" />
        <MockNumber label="Pace MRR (Maio)" value="R$ 187k" delta="+8%" meta="R$ 320k" hint="58% da meta" />
        <MockNumber label="Pipeline coverage" value="2,4x" delta="+0,3" hint="R$ aberto / meta restante" />
        <MockNumber label="Win rate (30d)" value="22%" delta="-3pp" meta="25%" hint="vendas / propostas enviadas" />
        <MockNumber label="Concentração top 5" value="62%" delta="+5pp" hint="da meta restante em 5 deals" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: O2.amber }} />
              Alertas automáticos
              <Badge variant="outline" className="text-[9px]">3</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">Configurar regras</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <AlertCard tone="critico" title="Closer Daniel Trindade abaixo de 40% no D+15"
            body="Realizado: 2/8 vendas (25%). Histórico do mês passado: 70%. Diferença: -45pp." />
          <AlertCard tone="alto" title="Propostas quentes esfriando: 3 cards com >14d em Proposta Enviada"
            body="Casa Viegas (27d), Tech Inova (18d), Construtora Pampa (15d). Risco de virar Loss." />
          <AlertCard tone="info" title="Pipeline RR caiu 22% WoW"
            body="S1: 11 RRs · S2: 9 RRs. Pode reduzir Proposta nas próximas 2 semanas." />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Pace gráfico — Vendas realizadas vs meta (acumulado Maio)" hint="Linha realizado vs linha meta">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={paceData} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Line type="monotone" dataKey="meta" stroke={O2.subtle} strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="realizado" stroke={O2.lima} strokeWidth={2.5} dot={{ fill: O2.lima, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Semana atual (S2) vs Meta semanal" hint="Realizado da semana vs meta rateada por dias úteis">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { fase: 'MQL', Meta: 12, Real: 6 },
              { fase: 'RM', Meta: 14, Real: 13 },
              { fase: 'RR', Meta: 12, Real: 9 },
              { fase: 'Prop', Meta: 8, Real: 6 },
              { fase: 'Venda', Meta: 4, Real: 0 },
            ]} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fase" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "rgba(99,241,97,0.06)" }} />
              <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Bar dataKey="Meta" fill={O2.subtle} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Real" fill={O2.lima} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <MiniTable
        title="🎯 Top 5 oportunidades por valor (próximas a fechar)"
        cols={["Cliente", "Fase", "MRR", "Dias na fase", "Closer", "Temperatura"]}
        rows={[
          ["Acme Holdings", "Proposta Enviada", "R$ 45k", "8d", "Pedro Albite", "🔥 Quente"],
          ["Construtora Pampa", "Proposta Enviada", "R$ 32k", "15d", "Daniel T.", "🔥→🟡 Esfriando"],
          ["Tech Inova", "Proposta Enviada", "R$ 28k", "18d", "Bruna", "🔥→🟡 Esfriando"],
          ["Casa Viegas", "Proposta Enviada", "R$ 25k", "27d", "Pedro Albite", "🟡 Morno"],
          ["Grupo XYZ", "Reunião Realizada", "R$ 22k", "5d", "Thiago", "🟡 Morno"],
        ]}
        hint="5 deals que sustentam a meta — clicar abre detalhe e histórico"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Ranking SDR — Atingimento da meta (RM)"
          cols={["SDR", "Meta", "Real", "Atinge%", "Ritmo"]}
          rows={[
            ["Carlos Ramos", 30, 15, "50% 🟡", "no pace"],
            ["Bruna P. Mota", 25, 9, "36% 🔴", "atrás"],
            ["Erica Rocha", 20, 3, "15% 🔴", "atrás"],
            ["Daniel Trindade", 15, 0, "0% 🔴", "atrás"],
          ]}
          hint="Ritmo: compara atingimento × % do mês transcorrido (50% do mês = atingimento esperado >=50%)"
        />
        <MiniTable
          title="Ranking Closer — Atingimento da meta (Vendas)"
          cols={["Closer", "Meta", "Real", "Atinge%", "Ritmo"]}
          rows={[
            ["Pedro Albite", 8, 6, "75% 🟢", "adiantado"],
            ["Bruna", 6, 4, "67% 🟡", "no pace"],
            ["Daniel Trindade", 6, 2, "33% 🔴", "atrás"],
            ["Thiago", 5, 2, "40% 🔴", "atrás"],
          ]}
          hint="Mesma lógica de ritmo. Clica no nome para ver detalhamento por etapa (RM/RR/Prop/Venda)"
        />
      </div>
    </div>
  );
}

function FunilConversao() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MockNumber label="MQL → RM" value="68%" delta="+4pp" meta="alvo 60%" hint="🟢 acima do alvo" />
        <MockNumber label="RM → RR" value="79%" delta="-2pp" meta="alvo 80%" hint="🟡 no alvo" />
        <MockNumber label="RR → Proposta" value="55%" delta="+1pp" meta="alvo 55%" hint="🟡 no alvo" />
        <MockNumber label="Proposta → Venda" value="22%" delta="-3pp" meta="alvo 30%" hint="🔴 abaixo — gargalo!" />
        <MockNumber label="Ciclo médio Lead→Venda" value="34d" delta="+2d" hint="ideal: <30d" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Funil visual — Modelo Atual" hint="MQL → RM → RR → Prop → Venda com volumes">
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Funnel dataKey="value" data={funilModeloAtual} isAnimationActive>
                <LabelList position="right" fill={O2.fg} stroke="none" dataKey="name" style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em" }} />
                <LabelList position="center" fill="#0A0A0A" stroke="none" dataKey="value" style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Funil visual — Expansão / Franquia" hint="Mesmo formato, side-by-side">
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Funnel dataKey="value" data={funilExpansao} isAnimationActive>
                <LabelList position="right" fill={O2.fg} stroke="none" dataKey="name" style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em" }} />
                <LabelList position="center" fill="#0A0A0A" stroke="none" dataKey="value" style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Velocity — dias médios por fase"
          cols={["Fase", "Dias médios", "Δ vs mês ant."]}
          rows={[
            ["MQL → RM", "2d", "—"],
            ["RM → RR", "7d", "+1d"],
            ["RR → Proposta", "5d", "—"],
            ["Proposta → Venda", "12d", "+3d ⚠️"],
            ["Total Lead → Venda", "34d", "+4d"],
          ]}
          hint="Calculado de Saída - Entrada por fase. Gargalo: Proposta crescendo."
        />
        <ChartCard title="Conversion rate por fase — tendência 12 semanas" hint="Linhas sobrepostas">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={convTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sem" />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
              <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Line type="monotone" dataKey="MQL→RM" stroke={O2.lima} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="RM→RR" stroke={O2.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="RR→Prop" stroke={O2.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Prop→Venda" stroke={O2.red} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Sankey: para onde vão os cards de cada fase" hint="Avança vs Loss por etapa (barra horizontal empilhada)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sankeyBar} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="fase" width={80} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "rgba(99,241,97,0.06)" }} />
            <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }} />
            <Bar dataKey="Avança" stackId="a" fill={O2.lima} radius={[4, 0, 0, 4]} />
            <Bar dataKey="Loss" stackId="a" fill={O2.red} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: O2.muted }} />
          Origem do lead (como entra no funil)
          <Badge variant="outline" className="text-[9px]">filtro auxiliar</Badge>
        </h3>
        <MiniTable
          title="Conversão por fonte"
          cols={["Fonte", "Leads", "MQL", "Venda", "Conv% lead→venda"]}
          rows={[
            ["Google Ads", 142, 68, 8, "5.6%"],
            ["Indicação", 22, 14, 4, "18.2% 🟢"],
            ["Meta Ads", 98, 41, 4, "4.1%"],
            ["Orgânico", 56, 18, 2, "3.6%"],
            ["Outbound", 31, 9, 2, "6.5%"],
          ]}
          hint="Clica na fonte pra ver campanhas, palavras-chave e páginas de origem"
        />
      </div>
    </div>
  );
}

function PipelineAberto() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="h-3 w-3 mr-1" /> Faixa: todas
        </Button>
        <Button variant="outline" size="sm" className="text-xs">Closer: todos</Button>
        <Button variant="outline" size="sm" className="text-xs">Produto: todos</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="o2-temp-hot p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5" style={{ color: O2.red }} />
            <span className="o2-mono" style={{ color: O2.red, fontSize: 11 }}>🔥 Quentes</span>
            <Badge variant="outline" className="ml-auto text-[9px]">Proposta Enviada</Badge>
          </div>
          <p className="o2-kpi">12</p>
          <p className="o2-mono mt-1" style={{ color: O2.muted }}>cards</p>
          <p className="text-xs mt-2" style={{ color: O2.muted }}>R$ 268k em MRR · forecast ponderado R$ 67k (25% win)</p>
          <p className="text-[11px] mt-2" style={{ color: O2.red }}>⚠️ 3 esfriando (&gt;14d sem fechar)</p>
        </div>
        <div className="o2-temp-warm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="h-5 w-5" style={{ color: O2.amber }} />
            <span className="o2-mono" style={{ color: O2.amber, fontSize: 11 }}>🟡 Mornos</span>
            <Badge variant="outline" className="ml-auto text-[9px]">RR realizada</Badge>
          </div>
          <p className="o2-kpi">18</p>
          <p className="o2-mono mt-1" style={{ color: O2.muted }}>cards</p>
          <p className="text-xs mt-2" style={{ color: O2.muted }}>R$ 312k em MRR · forecast ponderado R$ 47k (15% win)</p>
          <p className="text-[11px] mt-2" style={{ color: O2.amber }}>Próximo passo: enviar proposta</p>
        </div>
        <div className="o2-temp-cold p-4">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="h-5 w-5" style={{ color: O2.blue }} />
            <span className="o2-mono" style={{ color: O2.blue, fontSize: 11 }}>🔵 Frios</span>
            <Badge variant="outline" className="ml-auto text-[9px]">MQL + RM</Badge>
          </div>
          <p className="o2-kpi">42</p>
          <p className="o2-mono mt-1" style={{ color: O2.muted }}>cards</p>
          <p className="text-xs mt-2" style={{ color: O2.muted }}>R$ 188k em MRR · forecast ponderado R$ 12k (6% win)</p>
          <p className="text-[11px] mt-2" style={{ color: O2.blue }}>Próximo passo: qualificar e agendar RM/RR</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Meta restante (Maio)" value="14 vendas" hint="28 meta − 14 realizadas" />
        <MockNumber label="Forecast ponderado" value="R$ 126k" hint="Σ MRR × win% da fase" />
        <MockNumber label="Gap pipeline ↔ meta" value="−4 vendas" hint="forecast cobre 10/14 da meta" />
        <MockNumber label="Pipeline coverage" value="2.4x" hint="R$ aberto / meta restante" />
      </div>

      <div className="rounded-lg border p-3 text-xs flex items-center gap-2"
        style={{ borderColor: O2.amber, background: "rgba(245,179,66,0.08)", color: O2.amber }}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Diagnóstico:</strong> Forecast ponderado (R$ 126k = ~10 vendas) é insuficiente
          pra meta restante (14 vendas). Precisa subir win rate em Proposta de 22% pra 30% OU
          adicionar 4 quentes/mornos no pipe. Concentre esforço em fechar os 12 quentes.
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MockNumber label="Em risco (aging alto)" value="11 cards" delta="+2" hint=">14d sem mover" />
        <MockNumber label="Próximas 7 dias" value="6 fechamentos" hint="próxima ação prevista" />
        <MockNumber label="Cards sem próxima ação" value="8 cards 🔴" hint="risco silencioso — sem follow-up agendado" />
      </div>

      <MiniTable
        title="🔥 Quentes — Propostas Enviadas (ação prioritária)"
        cols={["Cliente", "Dias parado", "MRR", "Closer", "Próxima ação"]}
        rows={[
          ["Acme Holdings", "8d", "R$ 45k", "Pedro Albite", "Reunião decisora 18/05"],
          ["Casa Viegas", "27d ⚠️", "R$ 25k", "Pedro Albite", "Follow-up — atrasou"],
          ["Tech Inova", "18d ⚠️", "R$ 28k", "Bruna", "Aguardando contraproposta"],
          ["Construtora Pampa", "15d", "R$ 32k", "Daniel T.", "Renegociar valor"],
          ["+ 8 outros quentes…", "—", "—", "—", "—"],
        ]}
        hint="Ordenado por valor. Cards >14d destacados — risco de virar Loss"
      />

      <MiniTable
        title="🟡 Mornos — RR realizada, em negociação"
        cols={["Cliente", "Dias parado", "MRR", "Closer", "Próxima ação"]}
        rows={[
          ["Grupo XYZ", "5d", "R$ 22k", "Thiago", "Enviar proposta"],
          ["Distribuidora ABC", "12d", "R$ 18k", "Bruna", "Reunião técnica"],
          ["+ 16 outros mornos…", "—", "—", "—", "—"],
        ]}
      />

      <MiniTable
        title="🔵 Frios — em qualificação (MQL + RM)"
        cols={["Cliente", "Dias parado", "MRR estimado", "SDR", "Status"]}
        rows={[
          ["Lead 142", "1d", "R$ 12k", "Carlos Ramos", "RM agendada"],
          ["Lead 138", "3d", "R$ 8k", "Bruna P.M.", "Em qualificação"],
          ["+ 40 outros frios…", "—", "—", "—", "—"],
        ]}
      />
    </div>
  );
}

function HeatmapAtividade() {
  const max = 20;
  return (
    <ChartCard title="Heatmap: atividade × dia da semana" hint="Quando os SDRs estão agendando RM/RR? (revela produtividade)">
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", gap: 6 }}>
        <div />
        {heatDias.map((d) => (
          <div key={d} className="o2-mono text-center" style={{ fontSize: 9 }}>{d}</div>
        ))}
        {heatSDR.map((sdr, i) => (
          <Fragment key={sdr}>
            <div className="o2-mono flex items-center" style={{ fontSize: 9 }}>{sdr}</div>
            {heatValues[i].map((v, j) => {
              const intensity = v / max;
              const bg = `rgba(99,241,97,${0.08 + intensity * 0.72})`;
              return (
                <div key={`${i}-${j}`} className="o2-heat" style={{ background: bg }}>{v}</div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </ChartCard>
  );
}

function Pessoas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm">SDR</Button>
        <Button variant="ghost" size="sm">Closer</Button>
        <span className="o2-mono ml-2">filtro: BU, período</span>
      </div>

      <MiniTable
        title="Performance por SDR (período) — vs meta"
        cols={["SDR", "Meta", "Real", "Atinge%", "Ritmo", "RM→RR%", "Ciclo méd."]}
        rows={[
          ["Carlos Ramos", 30, 22, "73% 🟢", "adiantado", "82%", "32d"],
          ["Bruna P. Mota", 25, 18, "72% 🟢", "no pace", "88%", "28d"],
          ["Erica Rocha", 20, 8, "40% 🟡", "atrás", "65%", "—"],
          ["Daniel Trindade", 15, 1, "7% 🔴", "muito atrás", "—", "—"],
        ]}
        hint="Atingimento esperado pra hoje: ~67% do mês. Clica no nome para dossier individual com histórico semanal e gap diário."
      />

      <MiniTable
        title="Performance por Closer (período) — vs meta"
        cols={["Closer", "Meta", "Real", "Atinge%", "Ritmo", "Win%", "Ticket", "Ciclo"]}
        rows={[
          ["Pedro Albite", 8, 6, "75% 🟢", "adiantado", "30%", "R$ 28k", "10d"],
          ["Bruna", 6, 4, "67% 🟡", "no pace", "27%", "R$ 22k", "9d"],
          ["Daniel Trindade", 6, 2, "33% 🔴", "atrás", "12%", "R$ 18k", "18d ⚠️"],
          ["Thiago", 5, 2, "40% 🔴", "atrás", "15%", "R$ 15k", "14d"],
        ]}
        hint="Atingimento esperado: ~67%. Ticket revela quem fecha grande, Ciclo Prop→Venda longo sinaliza dificuldade no fechamento"
      />

      <div className="grid md:grid-cols-2 gap-4">
        <HeatmapAtividade />
        <ChartCard title="Win rate por closer × faixa de faturamento" hint="Quem ganha mais em ticket alto vs ticket baixo">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={winRateCloser} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="closer" width={90} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "rgba(99,241,97,0.06)" }} />
              <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }} />
              <Bar dataKey="Até 50k" fill={O2.lima} radius={[0, 4, 4, 0]} />
              <Bar dataKey="50–200k" fill={O2.amber} radius={[0, 4, 4, 0]} />
              <Bar dataKey="200k+" fill={O2.blue} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Dossier individual (drill-down ao clicar no nome)</CardTitle>
            <Badge variant="outline" className="o2-badge-lima text-[9px]">preview</Badge>
          </div>
          <p className="text-[11px]" style={{ color: O2.subtle }}>Histórico mensal, deals fechados/perdidos, motivos de perda, top clientes</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="o2-mono mb-1">Nome</p>
              <p className="o2-display" style={{ fontSize: 22 }}>Pedro Albite</p>
              <p className="text-xs mt-1" style={{ color: O2.muted }}>Closer · 18 meses</p>
            </div>
            <div>
              <p className="o2-mono mb-1">Win Rate 12m</p>
              <p className="o2-kpi-sm" style={{ color: O2.lima }}>31%</p>
            </div>
            <div>
              <p className="o2-mono mb-1">Ticket médio</p>
              <p className="o2-kpi-sm">R$ 28K</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CrossTabPerdas() {
  const maxV = 4;
  return (
    <ChartCard title="Cross-tab Motivo da Perda × Faixa de Faturamento" hint="Heatmap: onde cada motivo aparece mais? (revela padrão de objeção por porte)">
      <div style={{ display: "grid", gridTemplateColumns: "150px repeat(3, 1fr)", gap: 8 }}>
        <div />
        {perdaCross.faixas.map((f) => (
          <div key={f} className="o2-mono text-center">{f}</div>
        ))}
        {perdaCross.motivos.map((m, i) => (
          <Fragment key={m}>
            <div className="o2-mono flex items-center" style={{ fontSize: 10 }}>{m}</div>
            {perdaCross.values[i].map((v, j) => {
              const bg = `rgba(255,107,107,${0.1 + (v / maxV) * 0.65})`;
              return (
                <div key={`${i}-${j}`} className="o2-heat" style={{ background: bg, aspectRatio: "auto", height: 36 }}>{v}</div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </ChartCard>
  );
}

function Perdas() {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-3 text-xs"
        style={{
          border: `1px solid rgba(91,192,235,0.3)`,
          background: "rgba(91,192,235,0.06)",
          color: O2.blue,
        }}
      >
        💡 <strong>Importante:</strong> Esta aba mostra <strong>venda perdida no funil</strong>
        — cards que entraram em fase de Loss antes do fechamento. NÃO confundir com churn
        (cliente que cancelou depois de virar cliente) — isso está em Operação → Churn.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MockNumber label="Cards perdidos no período" value="23" delta="+5" />
        <MockNumber label="MRR potencial perdido" value="R$ 142k" delta="+18%" hint="MRR dos cards Loss" />
        <MockNumber label="Top motivo" value="Não viu valor" hint="9/23 = 39%" />
        <MockNumber label="Dias até perda" value="12d médio" hint="cedo = qualificação ruim" />
      </div>

      <CrossTabPerdas />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Motivos da perda — por volume"
          cols={["Motivo", "Cards", "MRR perdido", "Δ MoM"]}
          rows={[
            ["Não viu valor", 9, "R$ 38k", "+3"],
            ["Sem orçamento", 6, "R$ 22k", "+1"],
            ["Concorrência", 4, "R$ 45k ⚠️", "+2"],
            ["Não respondeu", 3, "R$ 18k", "−1"],
            ["Outros", 1, "R$ 19k", "—"],
          ]}
          hint="Concorrência sumiu? Verificar com closers em reunião"
        />
        <MiniTable
          title="Motivos por Closer (padrão revela treinamento)"
          cols={["Closer", "Motivo principal", "%"]}
          rows={[
            ["Pedro Albite", "Sem orçamento", "40%"],
            ["Bruna", "Não viu valor", "55%"],
            ["Daniel Trindade", "Concorrência", "70% ⚠️"],
            ["Thiago", "Não respondeu", "33%"],
          ]}
          hint="Closer perde sempre pelo mesmo motivo → coaching específico"
        />
      </div>

      <ChartCard title="Em qual fase as perdas estão acontecendo?" hint="Distribuição: perdemos em MQL, RM, RR ou Proposta? Cada fase pede ação diferente">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={perdaPorFase} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fase" />
            <YAxis />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: "rgba(255,107,107,0.08)" }} />
            <Bar dataKey="perdas" radius={[4, 4, 0, 0]}>
              {perdaPorFase.map((entry, i) => (
                <Cell key={i} fill={i === 0 ? O2.lima : i === 1 ? O2.amber : i === 2 ? "#FF9B5B" : O2.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tendência: motivos crescendo MoM (radar de alerta)" hint="Top 5 motivos nos últimos 6 meses">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={tendenciaMotivos} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }} />
            <Line type="monotone" dataKey="Não viu valor" stroke={O2.lima} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Sem orçamento" stroke={O2.amber} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Concorrência" stroke={O2.red} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Não respondeu" stroke={O2.blue} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Outros" stroke={O2.subtle} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// ───────────── Página principal ─────────────

// ───────────── Sticky filter bar (contexto: weekly meeting) ─────────────

const PERIODO_PRESETS = [
  { key: "semana", label: "Esta semana" },
  { key: "semana-ant", label: "Semana anterior" },
  { key: "mes", label: "Mês atual" },
  { key: "mes-ant", label: "Mês anterior" },
  { key: "tri", label: "Trimestre" },
  { key: "custom", label: "Customizado" },
];

const BU_OPTIONS = [
  { key: "consolidado", label: "Consolidado" },
  { key: "modelo_atual", label: "Modelo Atual" },
  { key: "franquia", label: "Franquia" },
  { key: "o2_tax", label: "O2 Tax" },
  { key: "oxy_hacker", label: "Oxy Hacker" },
];

const SDR_OPTIONS = ["Todos SDRs", "Carlos Ramos", "Bruna P. Mota", "Erica Rocha", "Daniel Trindade", "Matheus", "Ana"];
const CLOSER_OPTIONS = ["Todos Closers", "Pedro Albite", "Bruna", "Daniel Trindade", "Thiago", "Lucas Ilha", "Amanda Serafim"];

function StickyFilterBar({
  periodo, setPeriodo, bu, setBu, sdr, setSdr, closer, setCloser,
}: {
  periodo: string; setPeriodo: (v: string) => void;
  bu: string; setBu: (v: string) => void;
  sdr: string; setSdr: (v: string) => void;
  closer: string; setCloser: (v: string) => void;
}) {
  return (
    <div
      className="sticky top-0 z-30 -mx-6 px-6 py-3 mb-6 backdrop-blur-md"
      style={{
        background: "rgba(37,37,37,0.92)",
        borderBottom: `1px solid ${O2.lineStrong}`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2 max-w-[1400px] mx-auto">
        <Calendar className="h-3.5 w-3.5" style={{ color: O2.lima }} />
        <div className="flex gap-1 flex-wrap">
          {PERIODO_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className="px-2.5 py-1 rounded-full text-[10px] o2-mono transition-colors"
              style={{
                background: periodo === p.key ? O2.lima : "transparent",
                color: periodo === p.key ? "#0A0A0A" : O2.muted,
                border: `1px solid ${periodo === p.key ? O2.lima : O2.lineStrong}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="o2-mono mx-2" style={{ color: O2.subtle }}>·</span>
        <span className="o2-mono">BU:</span>
        <select
          value={bu}
          onChange={(e) => setBu(e.target.value)}
          className="px-3 py-1 rounded-full text-[11px] o2-mono cursor-pointer"
          style={{ background: O2.elev3, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}
        >
          {BU_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select
          value={sdr}
          onChange={(e) => setSdr(e.target.value)}
          className="px-3 py-1 rounded-full text-[11px] o2-mono cursor-pointer"
          style={{ background: O2.elev3, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}
        >
          {SDR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={closer}
          onChange={(e) => setCloser(e.target.value)}
          className="px-3 py-1 rounded-full text-[11px] o2-mono cursor-pointer"
          style={{ background: O2.elev3, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}
        >
          {CLOSER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="o2-mono hidden md:inline" style={{ color: O2.subtle }}>
            Atualizado: hoje 09:42
          </span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] o2-mono transition-colors"
            style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}
            title="Atualizar dados"
          >
            <RefreshCw className="h-3 w-3" /> Atualizar
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] o2-mono transition-colors"
            style={{ background: O2.elev3, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}
            title="Modo apresentação (weekly)"
          >
            <Maximize2 className="h-3 w-3" /> Modo weekly
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────── Key takeaway banner (por sub-aba) ─────────────
function TakeawayBanner({ icon, label, headline, sub }: { icon: React.ReactNode; label: string; headline: string; sub: string }) {
  return (
    <div
      className="rounded-2xl p-4 mb-5 flex items-start gap-3"
      style={{
        background: `linear-gradient(135deg, ${O2.elev3}, ${O2.surface})`,
        border: `1px solid ${O2.limaLine}`,
        boxShadow: `0 0 0 1px rgba(99,241,97,0.04) inset, 0 16px 48px rgba(0,0,0,0.18)`,
      }}
    >
      <div
        className="rounded-full p-2 shrink-0"
        style={{ background: O2.limaSoft, color: O2.lima }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="o2-mono mb-1" style={{ color: O2.lima }}>{label}</div>
        <div
          className="o2-display"
          style={{ fontSize: "clamp(18px, 2.2vw, 24px)", lineHeight: 1.1, marginBottom: 6 }}
        >
          {headline}
        </div>
        <div className="text-xs" style={{ color: O2.muted }}>{sub}</div>
      </div>
    </div>
  );
}

// ───────────── Página principal ─────────────

export default function ComercialPreview() {
  const [tab, setTab] = useState("executiva");
  const [periodo, setPeriodo] = useState("semana");
  const [bu, setBu] = useState("consolidado");
  const [sdr, setSdr] = useState("Todos SDRs");
  const [closer, setCloser] = useState("Todos Closers");

  const takeaways: Record<string, { icon: React.ReactNode; label: string; headline: string; sub: string }> = {
    executiva: {
      icon: <Lightbulb className="h-4 w-4" />,
      label: "Resumo da semana — para abrir a reunião",
      headline: "Estamos 12% atrás do pace de vendas",
      sub: "Top oportunidades concentram 62% da meta restante. Daniel Trindade precisa de coaching — 25% de atingimento no D+15.",
    },
    funil: {
      icon: <GitBranch className="h-4 w-4" />,
      label: "Gargalo identificado",
      headline: "Proposta → Venda em 22% (alvo: 30%)",
      sub: "Conversão na última etapa caiu 3pp WoW. Velocity em Proposta subiu pra 12d (média era 9d). Possíveis causas a discutir: objeção de preço? Closer? Faixa errada?",
    },
    pipeline: {
      icon: <Flame className="h-4 w-4" />,
      label: "Onde focar nas próximas 2 semanas",
      headline: "12 quentes — mas 3 esfriando há +14d",
      sub: "Forecast ponderado de R$ 126k cobre ~10/14 da meta restante. Precisa subir win rate em Proposta para 30% OU fechar os 3 quentes parados (Casa Viegas, Tech Inova, Construtora Pampa).",
    },
    pessoas: {
      icon: <Users className="h-4 w-4" />,
      label: "Gestão de pessoas — 1:1 desta semana",
      headline: "2 closers atrás do pace, 1 SDR muito atrás",
      sub: "Daniel Trindade (Closer): 33% atinge, ciclo Prop→Venda 18d (média 11d). Daniel Trindade (SDR): 7% atinge — investigar bloqueio. Bruna no pace em ambos os papéis.",
    },
    perdas: {
      icon: <TrendingDown className="h-4 w-4" />,
      label: "Padrões de perda — onde investir treinamento",
      headline: "Daniel Trindade perde 70% por concorrência",
      sub: "Concorrência cresceu +2 cards MoM. Maior MRR perdido (R$ 45k) vem desse motivo. Outros padrões por closer revelam necessidade de coaching específico.",
    },
  };
  const tk = takeaways[tab];

  return (
    <div className="o2-preview">
      <O2StyleScope />
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="o2-eyebrow">● Preview v4 · Weekly Meeting</span>
            <span className="o2-mono">Mock estático · sem dados reais</span>
          </div>
          <div className="flex items-end gap-5">
            <img
              src="/o2-brand/logos/logo-white.png"
              alt="O2"
              style={{ height: 56, width: "auto", objectFit: "contain" }}
            />
            <h1 className="o2-display" style={{ fontSize: "clamp(40px, 6vw, 78px)", margin: 0 }}>
              Indicadores<br />Comerciais
            </h1>
          </div>
        </div>

        {/* Sticky filter bar — sempre visível em reunião */}
        <StickyFilterBar
          periodo={periodo} setPeriodo={setPeriodo}
          bu={bu} setBu={setBu}
          sdr={sdr} setSdr={setSdr}
          closer={closer} setCloser={setCloser}
        />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-5">
            <TabsTrigger value="executiva" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Visão</span> Executiva
            </TabsTrigger>
            <TabsTrigger value="funil" className="gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              Funil & Conversão
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Flame className="h-3.5 w-3.5" />
              Pipeline 🔥🟡🔵
            </TabsTrigger>
            <TabsTrigger value="pessoas" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Pessoas
            </TabsTrigger>
            <TabsTrigger value="perdas" className="gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Perdas
            </TabsTrigger>
          </TabsList>

          {/* Key takeaway no topo de cada aba — bate-pronto pro gestor */}
          <TakeawayBanner icon={tk.icon} label={tk.label} headline={tk.headline} sub={tk.sub} />

          <TabsContent value="executiva"><VisaoExecutiva /></TabsContent>
          <TabsContent value="funil"><FunilConversao /></TabsContent>
          <TabsContent value="pipeline"><PipelineAberto /></TabsContent>
          <TabsContent value="pessoas"><Pessoas /></TabsContent>
          <TabsContent value="perdas"><Perdas /></TabsContent>
        </Tabs>

        <div className="mt-10 p-4 rounded-lg" style={{ border: `1px dashed ${O2.lineStrong}`, background: O2.elev2 }}>
          <p className="text-xs" style={{ color: O2.muted }}>
            <strong style={{ color: O2.lima }}>v4 — Pensado para weekly meeting:</strong> Barra de
            filtros sticky no topo (período, BU, SDR, Closer) sempre visível ao navegar entre abas ·
            Atalhos rápidos de período (Esta semana / Mês / Trimestre) · "Modo weekly" preparado
            para apresentação · Cada aba abre com <strong>key takeaway</strong> — frase única
            que resume o que discutir naquela sessão.
          </p>
        </div>
      </div>
    </div>
  );
}
