import { useState, Fragment, useEffect, useMemo, useRef, useCallback, createContext, useContext } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  LayoutDashboard, GitBranch, Users, Briefcase, TrendingDown,
  Info, ArrowUpRight, ArrowDownRight, AlertTriangle, Flame, Thermometer, Snowflake,
  Filter, Calendar, RefreshCw, ChevronDown, Lightbulb, Maximize2,
  ChevronLeft, ChevronRight, X, ExternalLink, Phone, Mail, FileText, Sparkles,
  Play, Volume2, Search, Keyboard, MessageSquare, Target, Shield, Zap, MoreHorizontal
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
        .o2-preview .o2-heat-clickable { cursor: pointer; transition: outline 180ms cubic-bezier(0.2,0.8,0.2,1); }
        .o2-preview .o2-heat-clickable:hover { outline: 1px solid ${O2.lima}; outline-offset: 1px; }

        /* Drill-down clickability */
        .o2-preview .o2-drill {
          background: transparent;
          border: none;
          padding: 0;
          color: inherit;
          font: inherit;
          cursor: pointer;
          text-align: inherit;
          transition: color 180ms cubic-bezier(0.2,0.8,0.2,1);
        }
        .o2-preview .o2-drill:hover {
          color: ${O2.lima};
          text-decoration: underline;
          text-decoration-style: dotted;
          text-decoration-color: ${O2.lima};
          text-underline-offset: 3px;
        }
        .o2-preview .o2-drill-name { font-weight: 500; }
        .o2-preview .o2-drill-num { font-weight: 700; }
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

function MiniTable({ title, rows, cols, hint, accent }: { title: string; rows: (string|number|React.ReactNode)[][]; cols: string[]; hint?: string; accent?: string }) {
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
                {r.map((cell, j) => <td key={j} className={`py-2 px-2 ${j > 0 ? 'text-right tabular-nums' : ''}`}>{cell as any}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// Helpers pra criar células clicáveis facilmente
function DealLink({ id, label }: { id: string; label: string }) {
  const { open } = useDrill();
  return <Clickable onClick={() => open({ kind: "deal", id })}>{label}</Clickable>;
}
function PersonLink({ id, label }: { id: string; label: string }) {
  const { open } = useDrill();
  return <Clickable onClick={() => open({ kind: "person", id, role: PEOPLE[id]?.role || "sdr" })}>{label}</Clickable>;
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

// ═════════════════════════════════════════════════════════════════
// DRILL-DOWN SYSTEM — contexto global + tipos + dados mock
// ═════════════════════════════════════════════════════════════════

type DrillTarget =
  | { kind: "deal"; id: string }
  | { kind: "person"; id: string; role: "sdr" | "closer" }
  | { kind: "list"; title: string; items: { id: string; primary: string; secondary: string; right?: string }[] };

type DrillContextValue = {
  open: (target: DrillTarget) => void;
  navigateDeal: (delta: 1 | -1) => void;
};
const DrillContext = createContext<DrillContextValue | null>(null);
const useDrill = () => {
  const v = useContext(DrillContext);
  if (!v) return { open: (_: DrillTarget) => {}, navigateDeal: (_: 1 | -1) => {} };
  return v;
};

// ───────────── Mock deals (com dados pra Deal Drawer) ─────────────

const QUENTES_LIST = ["acme", "casa-viegas", "tech-inova", "construtora-pampa", "grupo-xyz"];

const DEALS: Record<string, {
  id: string;
  nome: string;
  fase: string;
  faseTemp: "quente" | "morno" | "frio";
  mrr: number;
  closer: string;
  sdr: string;
  origem: string;
  diasNaFase: number;
  produtos: string[];
  faixa: string;
  reunioes: number;
  proxAcao: string;
  // brief IA
  statusIA: { text: string; confianca: "alta" | "media" | "baixa"; fonteRef?: string };
  sinaisCompra: { text: string; ts: string }[];
  objecoes: { text: string; severidade: "alta" | "media" | "baixa" }[];
  stakeholders: { nome: string; cargo: string; sentimento: number; tipo: "champion" | "blocker" | "neutro" }[];
  concorrentes: { nome: string; mencoes: number }[];
}> = {
  "acme": {
    id: "acme", nome: "Acme Holdings", fase: "Proposta Enviada", faseTemp: "quente",
    mrr: 45000, closer: "Pedro Albite", sdr: "Carlos Ramos", origem: "Indicação",
    diasNaFase: 8, produtos: ["CFOaaS", "Oxy"], faixa: "200k+", reunioes: 4,
    proxAcao: "Reunião decisora 18/05",
    statusIA: {
      text: "Aguardando retorno após RR de 12/05. Closer reportou interesse alto do CFO. Recomendado: ligar hoje pra desbloquear assinatura.",
      confianca: "alta", fonteRef: "R3 @ 23:14",
    },
    sinaisCompra: [
      { text: "Mencionou orçamento aprovado pelo CFO", ts: "12/05 · 23:14" },
      { text: "Pediu proposta formal com cronograma", ts: "08/05 · 18:42" },
      { text: "Pediu introdução a 2 clientes-referência", ts: "08/05 · 41:20" },
    ],
    objecoes: [
      { text: "Preocupação com prazo de implementação (90 dias)", severidade: "alta" },
      { text: "Comparando com [Concorrente Conta Azul]", severidade: "media" },
    ],
    stakeholders: [
      { nome: "Roberto Silva", cargo: "CFO", sentimento: 4, tipo: "champion" },
      { nome: "Marina Costa", cargo: "Controller", sentimento: 3, tipo: "neutro" },
      { nome: "Pedro Almeida", cargo: "CEO", sentimento: 5, tipo: "champion" },
    ],
    concorrentes: [{ nome: "Conta Azul", mencoes: 3 }, { nome: "Omie", mencoes: 1 }],
  },
  "casa-viegas": {
    id: "casa-viegas", nome: "Casa Viegas", fase: "Proposta Enviada", faseTemp: "quente",
    mrr: 25000, closer: "Pedro Albite", sdr: "Bruna P. Mota", origem: "Google Ads",
    diasNaFase: 27, produtos: ["Gênio", "SaaS Oxy"], faixa: "50–200k", reunioes: 3,
    proxAcao: "Follow-up atrasado — ligar HOJE",
    statusIA: {
      text: "ESFRIANDO. 27 dias parado sem retorno. Cliente sumiu após enviar proposta. Recomendado: ligar Rodrigo (interlocução) hoje. Se não atender em 24h, considerar mover pra 'aguardando' com alerta de risco.",
      confianca: "alta", fonteRef: "R3 @ 15:42",
    },
    sinaisCompra: [
      { text: "Aprovou setup de R$ 15k inicial", ts: "23/04 · 15:42" },
      { text: "Demonstrou urgência (renovação de ERP)", ts: "23/04 · 28:10" },
    ],
    objecoes: [
      { text: "CFO mudou no meio do processo — novo decisor não respondeu", severidade: "alta" },
      { text: "Comparando com manter contabilidade tradicional", severidade: "media" },
    ],
    stakeholders: [
      { nome: "Rodrigo (Interlocução)", cargo: "Gerente Fin.", sentimento: 4, tipo: "champion" },
      { nome: "(novo CFO)", cargo: "CFO", sentimento: 2, tipo: "blocker" },
    ],
    concorrentes: [{ nome: "Contabilidade local", mencoes: 2 }],
  },
  "tech-inova": {
    id: "tech-inova", nome: "Tech Inova", fase: "Proposta Enviada", faseTemp: "quente",
    mrr: 28000, closer: "Bruna", sdr: "Carlos Ramos", origem: "Indicação",
    diasNaFase: 18, produtos: ["CFOaaS"], faixa: "50–200k", reunioes: 5,
    proxAcao: "Aguardando contraproposta",
    statusIA: {
      text: "Cliente pediu contraproposta com escopo reduzido (-30%). Indicação clara de fechamento se aceitarmos. Recomendado: discutir margem com Pedrolo antes de aceitar.",
      confianca: "alta",
    },
    sinaisCompra: [
      { text: "Pediu contraproposta com escopo (= sinal de fechamento)", ts: "30/04 · 22:00" },
      { text: "Confirmou budget Q3 disponível", ts: "30/04 · 28:30" },
    ],
    objecoes: [{ text: "Acha preço alto pro escopo full", severidade: "media" }],
    stakeholders: [
      { nome: "André Tech", cargo: "CEO", sentimento: 4, tipo: "champion" },
      { nome: "Lara Costa", cargo: "CFO", sentimento: 3, tipo: "neutro" },
    ],
    concorrentes: [],
  },
  "construtora-pampa": {
    id: "construtora-pampa", nome: "Construtora Pampa", fase: "Proposta Enviada", faseTemp: "quente",
    mrr: 32000, closer: "Daniel Trindade", sdr: "Bruna P. Mota", origem: "Outbound",
    diasNaFase: 15, produtos: ["CFOaaS", "Oxy + Gênio"], faixa: "200k+", reunioes: 3,
    proxAcao: "Renegociar valor",
    statusIA: {
      text: "Cliente sinalizou orçamento R$ 28k vs proposta R$ 32k. Closer Daniel tem dificuldade em fechamentos longos (média 18d). Recomendado: cover do Pedrolo na renegociação.",
      confianca: "media",
    },
    sinaisCompra: [{ text: "Confirmou decisão pra final de maio", ts: "05/05 · 12:15" }],
    objecoes: [{ text: "Valor 12% acima do orçamento original", severidade: "alta" }],
    stakeholders: [{ nome: "Carlos Pampa", cargo: "CFO", sentimento: 3, tipo: "neutro" }],
    concorrentes: [{ nome: "Conta Azul", mencoes: 1 }],
  },
  "grupo-xyz": {
    id: "grupo-xyz", nome: "Grupo XYZ", fase: "Reunião Realizada", faseTemp: "morno",
    mrr: 22000, closer: "Thiago", sdr: "Erica Rocha", origem: "Google Ads",
    diasNaFase: 5, produtos: ["CFOaaS"], faixa: "50–200k", reunioes: 2,
    proxAcao: "Enviar proposta",
    statusIA: {
      text: "RR completa com sinais positivos. Sem objeções claras. Recomendado: enviar proposta nas próximas 48h enquanto interesse está fresco.",
      confianca: "alta",
    },
    sinaisCompra: [{ text: "Pediu prazos de implantação", ts: "10/05 · 35:20" }],
    objecoes: [],
    stakeholders: [{ nome: "Patrícia Souza", cargo: "CFO", sentimento: 4, tipo: "champion" }],
    concorrentes: [],
  },
};

// Reuniões mock por deal (com transcrição)
type Reuniao = {
  id: string;
  data: string;
  tipo: "R1" | "R2" | "R3" | "Proposta" | "Outras";
  duracao: number; // min
  participantes: string[];
  sentimento: number; // 1-5
  trechos: { ts: string; speaker: string; texto: string; tipo?: "compra" | "objecao" | "acao" }[];
};

const REUNIOES_MOCK: Record<string, Reuniao[]> = {
  "acme": [
    {
      id: "r3", data: "12/05/2026", tipo: "R3", duracao: 47, participantes: ["Roberto Silva (CFO)", "Marina Costa", "Pedro Albite (O2)"], sentimento: 4,
      trechos: [
        { ts: "00:08:32", speaker: "Roberto (CFO)", texto: "A gente está com o orçamento aprovado pra esse trimestre, então o que falta é só decidir o cronograma." },
        { ts: "00:23:14", speaker: "Roberto (CFO)", texto: "Falei com o Pedro CEO e o orçamento foi aprovado. Vamos andar.", tipo: "compra" },
        { ts: "00:31:05", speaker: "Marina (Controller)", texto: "Mas 90 dias de implementação me preocupa, a gente teria que rodar em paralelo com a Conta Azul.", tipo: "objecao" },
        { ts: "00:38:20", speaker: "Pedro (O2)", texto: "Posso te enviar 2 cases de implantação em 60 dias até amanhã.", tipo: "acao" },
      ],
    },
    {
      id: "r2", data: "08/05/2026", tipo: "R2", duracao: 52, participantes: ["Roberto Silva (CFO)", "Pedro Almeida (CEO)", "Pedro Albite (O2)"], sentimento: 5,
      trechos: [
        { ts: "00:18:42", speaker: "Roberto (CFO)", texto: "Quero uma proposta formal com cronograma detalhado.", tipo: "compra" },
        { ts: "00:41:20", speaker: "Pedro Almeida (CEO)", texto: "Tem como me conectar com 2 clientes pra eu ouvir a experiência?", tipo: "compra" },
      ],
    },
  ],
  "casa-viegas": [
    {
      id: "r3", data: "23/04/2026", tipo: "R3", duracao: 38, participantes: ["Rodrigo (Gerente Fin.)", "Pedro Albite (O2)"], sentimento: 3,
      trechos: [
        { ts: "00:15:42", speaker: "Rodrigo", texto: "Vou aprovar o setup de R$ 15k inicial e a gente segue.", tipo: "compra" },
        { ts: "00:28:10", speaker: "Rodrigo", texto: "Nosso ERP atual está renovando agora, precisamos resolver isso rápido.", tipo: "compra" },
        { ts: "00:34:55", speaker: "Rodrigo", texto: "Mas o CFO vai ser substituído na próxima semana. Tem que apresentar pro novo." },
      ],
    },
  ],
  "tech-inova": [
    {
      id: "r3", data: "30/04/2026", tipo: "R3", duracao: 55, participantes: ["André Tech (CEO)", "Lara Costa (CFO)", "Bruna (O2)"], sentimento: 4,
      trechos: [
        { ts: "00:22:00", speaker: "Lara (CFO)", texto: "Vamos fazer uma contraproposta com escopo menor. Tira o módulo Oxy por enquanto.", tipo: "compra" },
        { ts: "00:28:30", speaker: "Lara (CFO)", texto: "Budget de Q3 está confirmado, podemos começar em julho.", tipo: "compra" },
        { ts: "00:38:40", speaker: "André", texto: "Acho o preço alto se for tudo, com escopo reduzido faz sentido.", tipo: "objecao" },
      ],
    },
  ],
  "construtora-pampa": [
    {
      id: "r2", data: "05/05/2026", tipo: "R2", duracao: 42, participantes: ["Carlos Pampa (CFO)", "Daniel T. (O2)"], sentimento: 3,
      trechos: [
        { ts: "00:12:15", speaker: "Carlos Pampa", texto: "A gente vai decidir até fim de maio.", tipo: "compra" },
        { ts: "00:32:00", speaker: "Carlos Pampa", texto: "O valor está R$ 4k acima do que aprovamos internamente.", tipo: "objecao" },
      ],
    },
  ],
  "grupo-xyz": [
    {
      id: "r2", data: "10/05/2026", tipo: "R2", duracao: 36, participantes: ["Patrícia Souza (CFO)", "Thiago (O2)"], sentimento: 4,
      trechos: [
        { ts: "00:35:20", speaker: "Patrícia", texto: "Qual o prazo de implementação se a gente fechar essa semana?", tipo: "compra" },
      ],
    },
  ],
};

// Pessoas mock (dossier)
const PEOPLE: Record<string, { id: string; nome: string; role: "sdr" | "closer"; meta: number; real: number; pace: string; bu: string; ciclo: string; gargalo: string; topClientes: string[] }> = {
  "carlos": { id: "carlos", nome: "Carlos Ramos", role: "sdr", meta: 30, real: 22, pace: "adiantado", bu: "Modelo Atual", ciclo: "32d", gargalo: "RR→Prop em 50% (média do time: 65%)", topClientes: ["Acme Holdings", "Tech Inova"] },
  "bruna-sdr": { id: "bruna-sdr", nome: "Bruna P. Mota", role: "sdr", meta: 25, real: 18, pace: "no pace", bu: "Franquia", ciclo: "28d", gargalo: "—", topClientes: ["Casa Viegas", "Distribuidora ABC"] },
  "erica": { id: "erica", nome: "Erica Rocha", role: "sdr", meta: 20, real: 8, pace: "atrás", bu: "Modelo Atual", ciclo: "—", gargalo: "RM→RR baixo (65%)", topClientes: ["Grupo XYZ"] },
  "daniel-sdr": { id: "daniel-sdr", nome: "Daniel Trindade", role: "sdr", meta: 15, real: 1, pace: "muito atrás", bu: "Modelo Atual", ciclo: "—", gargalo: "Volume muito baixo — investigar bloqueio", topClientes: [] },
  "pedro": { id: "pedro", nome: "Pedro Albite", role: "closer", meta: 8, real: 6, pace: "adiantado", bu: "Modelo Atual", ciclo: "10d (Prop→Venda)", gargalo: "—", topClientes: ["Acme Holdings", "Casa Viegas"] },
  "bruna-closer": { id: "bruna-closer", nome: "Bruna", role: "closer", meta: 6, real: 4, pace: "no pace", bu: "Franquia", ciclo: "9d", gargalo: "—", topClientes: ["Tech Inova"] },
  "daniel-closer": { id: "daniel-closer", nome: "Daniel Trindade", role: "closer", meta: 6, real: 2, pace: "atrás", bu: "Modelo Atual", ciclo: "18d ⚠️", gargalo: "Ciclo Prop→Venda 18d (média 11d). 70% perdas por concorrência", topClientes: ["Construtora Pampa"] },
  "thiago": { id: "thiago", nome: "Thiago", role: "closer", meta: 5, real: 2, pace: "atrás", bu: "Modelo Atual", ciclo: "14d", gargalo: "Ticket médio baixo (R$ 15k)", topClientes: ["Grupo XYZ"] },
};

// ═════════════════════════════════════════════════════════════════
// COMPONENTES — Clicável, Deal Drawer, Pessoa Drawer, Sheet List, Command Palette
// ═════════════════════════════════════════════════════════════════

function Clickable({
  children, onClick, kind = "name",
}: { children: React.ReactNode; onClick: () => void; kind?: "name" | "num" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`o2-drill o2-drill-${kind}`}
      data-drill={kind}
    >
      {children}
    </button>
  );
}

// ───────────── Deal Drawer ─────────────
function DealDrawer({ dealId, list, onChange, onClose }: {
  dealId: string;
  list: string[];
  onChange: (newId: string) => void;
  onClose: () => void;
}) {
  const deal = DEALS[dealId];
  const reunioes = REUNIOES_MOCK[dealId] || [];
  const [tab, setTab] = useState<"brief" | "reunioes" | "historico" | "dados">("brief");
  const [trechoFiltro, setTrechoFiltro] = useState<"tudo" | "compra" | "objecao" | "acao">("tudo");
  const idx = list.indexOf(dealId);
  const total = list.length;
  const canPrev = idx > 0;
  const canNext = idx < total - 1 && idx !== -1;

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "j" || e.key === "ArrowRight") { if (canNext) onChange(list[idx + 1]); }
      if (e.key === "k" || e.key === "ArrowLeft") { if (canPrev) onChange(list[idx - 1]); }
      if (e.key === "1") setTab("brief");
      if (e.key === "2") setTab("reunioes");
      if (e.key === "3") setTab("historico");
      if (e.key === "4") setTab("dados");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, list, canPrev, canNext, onChange]);

  if (!deal) return null;

  const tempColor = deal.faseTemp === "quente" ? O2.red : deal.faseTemp === "morno" ? O2.amber : O2.blue;
  const tempLabel = deal.faseTemp === "quente" ? "🔥 QUENTE" : deal.faseTemp === "morno" ? "🟡 MORNO" : "🔵 FRIO";
  const confColor = deal.statusIA.confianca === "alta" ? O2.lima : deal.statusIA.confianca === "media" ? O2.amber : O2.subtle;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="o2-preview p-0 sm:max-w-[720px] w-[720px] flex flex-col"
        style={{ background: O2.surface, color: O2.fg, borderLeft: `1px solid ${O2.lineStrong}` }}
      >
        <O2StyleScope />
        {/* HEADER */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b" style={{ borderColor: O2.line, background: O2.elev3 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => canPrev && onChange(list[idx - 1])}
                disabled={!canPrev}
                className="rounded-full p-1.5 disabled:opacity-30"
                style={{ background: O2.surface, border: `1px solid ${O2.lineStrong}`, color: O2.fg }}
                title="Anterior (K)"
              ><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => canNext && onChange(list[idx + 1])}
                disabled={!canNext}
                className="rounded-full p-1.5 disabled:opacity-30"
                style={{ background: O2.surface, border: `1px solid ${O2.lineStrong}`, color: O2.fg }}
                title="Próximo (J)"
              ><ChevronRight className="h-3.5 w-3.5" /></button>
              {idx >= 0 && (
                <span className="o2-mono ml-2">{idx + 1} de {total} · quentes</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="o2-mono px-2 py-1 rounded-full" style={{ border: `1px solid ${O2.lineStrong}` }}>
                <MoreHorizontal className="h-3 w-3" />
              </button>
              <button onClick={onClose} className="o2-mono px-2 py-1 rounded-full" style={{ border: `1px solid ${O2.lineStrong}` }} title="Fechar (Esc)">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <h2 className="o2-display" style={{ fontSize: 32, lineHeight: 1, margin: 0 }}>{deal.nome}</h2>
            <span className="o2-mono px-2 py-1 rounded-full" style={{ background: `${tempColor}22`, color: tempColor, border: `1px solid ${tempColor}55` }}>{tempLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: O2.muted }}>
            <span>Fase: <strong style={{ color: O2.fg }}>{deal.fase}</strong></span>
            <span>·</span>
            <span>MRR: <strong style={{ color: O2.lima }}>R$ {(deal.mrr / 1000).toFixed(0)}k</strong></span>
            <span>·</span>
            <span>Closer: <strong style={{ color: O2.fg }}>{deal.closer}</strong></span>
            <span>·</span>
            <span>{deal.diasNaFase}d na fase</span>
            <span>·</span>
            <span>Origem: {deal.origem}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {([["brief", "Brief IA"], ["reunioes", `Reuniões ${reunioes.length}`], ["historico", "Histórico"], ["dados", "Dados"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                className="px-3 py-1.5 rounded-lg o2-mono"
                style={{
                  background: tab === k ? O2.surface : "transparent",
                  color: tab === k ? O2.lima : O2.muted,
                  border: `1px solid ${tab === k ? O2.limaLine : "transparent"}`,
                  boxShadow: tab === k ? `inset 0 -2px 0 ${O2.lima}` : undefined,
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* BODY scroll */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab === "brief" && <BriefIA deal={deal} onSeekReuniao={() => setTab("reunioes")} />}
          {tab === "reunioes" && <ReunioesTab reunioes={reunioes} filtro={trechoFiltro} setFiltro={setTrechoFiltro} />}
          {tab === "historico" && <HistoricoTab deal={deal} reunioes={reunioes} />}
          {tab === "dados" && <DadosTab deal={deal} />}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="shrink-0 px-6 py-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: O2.line, background: O2.elev3 }}>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full o2-mono" style={{ background: O2.lima, color: "#0A0A0A" }}>
            Mover fase <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full o2-mono" style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
            <Phone className="h-3 w-3" /> Follow-up
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full o2-mono" style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
            <Mail className="h-3 w-3" /> Gerar email
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full o2-mono" style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
            <FileText className="h-3 w-3" /> Nota
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full o2-mono ml-auto" style={{ background: "transparent", color: O2.muted, border: `1px solid ${O2.lineStrong}` }}>
            <ExternalLink className="h-3 w-3" /> Abrir no Pipefy
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BriefIA({ deal, onSeekReuniao }: { deal: typeof DEALS["acme"]; onSeekReuniao: (ts?: string) => void }) {
  const confColor = deal.statusIA.confianca === "alta" ? O2.lima : deal.statusIA.confianca === "media" ? O2.amber : O2.subtle;
  return (
    <div className="space-y-4">
      {/* Faixa fina IA */}
      <div className="flex items-center justify-between text-[10px]" style={{ color: O2.subtle }}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3" style={{ color: O2.lima }} />
          <span className="o2-mono">Brief gerado em 14/05 14:32 · baseado em {deal.reunioes} reuniões e 23 mensagens</span>
        </div>
        <button className="o2-mono px-2 py-1 rounded-full" style={{ border: `1px solid ${O2.lineStrong}`, color: O2.fg }}>
          <RefreshCw className="h-3 w-3 inline mr-1" /> Regenerar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Coluna principal 60% */}
        <div className="md:col-span-3 space-y-4">
          {/* Status & Próxima ação */}
          <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.limaLine}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" style={{ color: O2.lima }} />
              <span className="o2-mono" style={{ color: O2.lima }}>Status & Próxima ação</span>
              <span className="ml-auto o2-mono px-2 py-0.5 rounded-full" style={{ background: `${confColor}22`, color: confColor, border: `1px solid ${confColor}55` }}>
                ● Confiança {deal.statusIA.confianca}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: O2.fg }}>{deal.statusIA.text}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="o2-mono px-3 py-1.5 rounded-full" style={{ background: O2.lima, color: "#0A0A0A" }}>
                Agendar ligação
              </button>
              <button className="o2-mono px-3 py-1.5 rounded-full" style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
                Marcar como feito
              </button>
              {deal.statusIA.fonteRef && (
                <button onClick={() => onSeekReuniao()} className="o2-mono ml-auto" style={{ color: O2.lima, textDecoration: "underline dotted" }}>
                  Ver fonte: {deal.statusIA.fonteRef} →
                </button>
              )}
            </div>
          </div>

          {/* Sinais de compra */}
          <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4" style={{ color: O2.lima }} />
              <span className="o2-mono" style={{ color: O2.lima }}>Sinais de compra ({deal.sinaisCompra.length})</span>
            </div>
            <ul className="space-y-2">
              {deal.sinaisCompra.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="o2-mono shrink-0 mt-0.5" style={{ color: O2.lima }}>↑</span>
                  <div className="flex-1">
                    <span style={{ color: O2.fg }}>{s.text}</span>
                    <button onClick={() => onSeekReuniao(s.ts)} className="o2-mono ml-2" style={{ color: O2.subtle, textDecoration: "underline dotted" }}>{s.ts}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Objeções */}
          {deal.objecoes.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" style={{ color: O2.amber }} />
                <span className="o2-mono" style={{ color: O2.amber }}>Objeções & Riscos ({deal.objecoes.length})</span>
              </div>
              <ul className="space-y-2">
                {deal.objecoes.map((o, i) => {
                  const sev = o.severidade === "alta" ? O2.red : o.severidade === "media" ? O2.amber : O2.subtle;
                  return (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 mt-0.5" style={{ color: sev }}>⚠</span>
                      <div className="flex-1">
                        <span style={{ color: O2.fg }}>{o.text}</span>
                        <span className="o2-mono ml-2 px-1.5 py-0.5 rounded" style={{ background: `${sev}22`, color: sev }}>{o.severidade}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Coluna lateral 40% */}
        <div className="md:col-span-2 space-y-4">
          {/* Stakeholders */}
          <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" style={{ color: O2.fg }} />
              <span className="o2-mono">Decision Makers</span>
            </div>
            <div className="space-y-3">
              {deal.stakeholders.map((s, i) => {
                const tipoColor = s.tipo === "champion" ? O2.lima : s.tipo === "blocker" ? O2.red : O2.subtle;
                const tipoLabel = s.tipo === "champion" ? "Champion" : s.tipo === "blocker" ? "Blocker" : "Neutro";
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="rounded-full w-7 h-7 flex items-center justify-center shrink-0" style={{ background: `${tipoColor}22`, color: tipoColor, fontSize: 10, fontWeight: 700 }}>
                      {s.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{s.nome}</div>
                      <div className="o2-mono" style={{ color: O2.muted }}>{s.cargo}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="o2-mono px-1.5 py-0.5 rounded" style={{ background: `${tipoColor}22`, color: tipoColor }}>{tipoLabel}</span>
                        <span className="o2-mono" style={{ color: O2.muted }}>{"●".repeat(s.sentimento)}{"○".repeat(5 - s.sentimento)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Concorrentes */}
          {deal.concorrentes.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4" style={{ color: O2.amber }} />
                <span className="o2-mono">Concorrentes mencionados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {deal.concorrentes.map((c, i) => (
                  <button key={i} onClick={() => onSeekReuniao()} className="o2-mono px-2 py-1 rounded-full" style={{ background: O2.surface, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
                    {c.nome} · {c.mencoes}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReunioesTab({ reunioes, filtro, setFiltro }: { reunioes: Reuniao[]; filtro: "tudo" | "compra" | "objecao" | "acao"; setFiltro: (f: any) => void }) {
  const filtros: { key: typeof filtro; label: string; color: string }[] = [
    { key: "tudo", label: "Tudo", color: O2.muted },
    { key: "compra", label: "🟢 Compra", color: O2.lima },
    { key: "objecao", label: "🟡 Objeção", color: O2.amber },
    { key: "acao", label: "🔵 Ação", color: O2.blue },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="o2-mono">Filtrar trechos:</span>
        {filtros.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} className="o2-mono px-2.5 py-1 rounded-full"
            style={{ background: filtro === f.key ? `${f.color}22` : "transparent", color: filtro === f.key ? f.color : O2.muted, border: `1px solid ${filtro === f.key ? f.color : O2.lineStrong}` }}>
            {f.label}
          </button>
        ))}
      </div>
      {reunioes.length === 0 && (
        <div className="text-center py-8 o2-mono" style={{ color: O2.subtle }}>Nenhuma reunião registrada.</div>
      )}
      {reunioes.map(r => (
        <div key={r.id} className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="o2-mono px-2 py-0.5 rounded-full" style={{ background: O2.limaSoft, color: O2.lima, border: `1px solid ${O2.limaLine}` }}>{r.tipo}</span>
                <span className="text-sm font-semibold">{r.data}</span>
                <span className="o2-mono" style={{ color: O2.muted }}>· {r.duracao} min</span>
                <span className="o2-mono" style={{ color: O2.muted }}>· Sentimento {"●".repeat(r.sentimento)}{"○".repeat(5 - r.sentimento)}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: O2.muted }}>
                {r.participantes.join(" · ")}
              </div>
            </div>
            <button className="o2-mono px-3 py-1.5 rounded-full" style={{ background: "transparent", color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
              <Play className="h-3 w-3 inline mr-1" /> Reproduzir
            </button>
          </div>
          {/* Trechos */}
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: O2.line }}>
            {r.trechos
              .filter(t => filtro === "tudo" ? true : t.tipo === filtro)
              .map((t, i) => {
                const tipoColor = t.tipo === "compra" ? O2.lima : t.tipo === "objecao" ? O2.amber : t.tipo === "acao" ? O2.blue : null;
                return (
                  <div key={i} className="flex gap-3 text-xs py-1.5">
                    <button className="o2-mono shrink-0" style={{ color: O2.lima, textDecoration: "underline dotted" }}>
                      {t.ts}
                    </button>
                    <div className="flex-1">
                      <div className="o2-mono mb-0.5" style={{ color: O2.muted }}>{t.speaker}</div>
                      <div className="leading-relaxed" style={tipoColor ? { color: O2.fg, background: `${tipoColor}11`, padding: "4px 8px", borderRadius: 6, borderLeft: `2px solid ${tipoColor}` } : { color: O2.fg }}>
                        "{t.texto}"
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoricoTab({ deal, reunioes }: { deal: typeof DEALS["acme"]; reunioes: Reuniao[] }) {
  const eventos = [
    { data: "08/03/2026", tipo: "📥 Entrada Pipefy", desc: `Lead criado · Origem: ${deal.origem}` },
    { data: "12/03/2026", tipo: "✅ RM realizada", desc: "Cliente Participou: Sim" },
    ...reunioes.map(r => ({ data: r.data, tipo: `📞 ${r.tipo} realizada`, desc: `${r.duracao} min · sentimento ${r.sentimento}/5` })),
    { data: "14/05/2026", tipo: "💼 Em proposta", desc: `Valor R$ ${(deal.mrr / 1000).toFixed(0)}k/mês` },
  ];
  return (
    <div className="space-y-3">
      {eventos.map((e, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="o2-mono w-20 shrink-0 pt-1" style={{ color: O2.subtle }}>{e.data}</div>
          <div className="flex-1 rounded-xl p-3" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
            <div className="text-xs font-semibold mb-0.5">{e.tipo}</div>
            <div className="text-xs" style={{ color: O2.muted }}>{e.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DadosTab({ deal }: { deal: typeof DEALS["acme"] }) {
  const linhas: [string, string][] = [
    ["Empresa", deal.nome],
    ["Fase atual", deal.fase],
    ["MRR proposto", `R$ ${deal.mrr.toLocaleString("pt-BR")}/mês`],
    ["Faixa de faturamento", deal.faixa],
    ["Produtos", deal.produtos.join(", ")],
    ["Origem", deal.origem],
    ["SDR", deal.sdr],
    ["Closer", deal.closer],
    ["Dias na fase", `${deal.diasNaFase} dias`],
    ["Próxima ação", deal.proxAcao],
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
      {linhas.map(([k, v], i) => (
        <div key={k} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < linhas.length - 1 ? `1px solid ${O2.line}` : undefined }}>
          <span className="o2-mono">{k}</span>
          <span className="text-sm font-medium" style={{ color: O2.fg }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ───────────── Pessoa Drawer ─────────────
function PessoaDrawer({ personId, onClose }: { personId: string; onClose: () => void }) {
  const p = PEOPLE[personId];
  if (!p) return null;
  const paceColor = p.pace === "adiantado" ? O2.lima : p.pace === "no pace" ? O2.lima : p.pace === "atrás" ? O2.amber : O2.red;
  const atinge = (p.real / p.meta) * 100;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="o2-preview p-0 sm:max-w-[560px] w-[560px] flex flex-col"
        style={{ background: O2.surface, color: O2.fg, borderLeft: `1px solid ${O2.lineStrong}` }}
      >
        <O2StyleScope />
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: O2.line, background: O2.elev3 }}>
          <div className="flex items-center justify-between mb-3">
            <span className="o2-eyebrow">{p.role === "sdr" ? "SDR" : "Closer"} · {p.bu}</span>
            <button onClick={onClose} className="o2-mono px-2 py-1 rounded-full" style={{ border: `1px solid ${O2.lineStrong}` }}><X className="h-3 w-3" /></button>
          </div>
          <h2 className="o2-display" style={{ fontSize: 28, margin: 0 }}>{p.nome}</h2>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
              <div className="o2-mono">Meta</div>
              <div className="o2-kpi-sm">{p.meta}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
              <div className="o2-mono">Real</div>
              <div className="o2-kpi-sm" style={{ color: O2.lima }}>{p.real}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: O2.elev3, border: `1px solid ${O2.line}` }}>
              <div className="o2-mono">Atinge</div>
              <div className="o2-kpi-sm" style={{ color: paceColor }}>{atinge.toFixed(0)}%</div>
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: O2.elev3, border: `1px solid ${paceColor}55` }}>
            <div className="o2-mono mb-2" style={{ color: paceColor }}>Diagnóstico</div>
            <div className="text-sm">
              Ritmo: <strong style={{ color: paceColor }}>{p.pace}</strong> · Ciclo médio: {p.ciclo}
            </div>
            {p.gargalo !== "—" && (
              <div className="text-sm mt-2" style={{ color: O2.amber }}>
                ⚠ Gargalo: {p.gargalo}
              </div>
            )}
          </div>
          <div>
            <div className="o2-mono mb-2">Top clientes ({p.topClientes.length})</div>
            {p.topClientes.length === 0 && <div className="text-xs" style={{ color: O2.subtle }}>Nenhum cliente atribuído.</div>}
            <ul className="space-y-1">
              {p.topClientes.map(c => (
                <li key={c} className="text-sm flex items-center justify-between p-2 rounded-lg" style={{ background: O2.elev3 }}>
                  <span>{c}</span>
                  <ExternalLink className="h-3 w-3" style={{ color: O2.muted }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ───────────── Sheet (lista compacta — KPI/segmento/fase) ─────────────
function ListSheet({ data, onClose, onPickDeal }: { data: { title: string; items: { id: string; primary: string; secondary: string; right?: string }[] }; onClose: () => void; onPickDeal: (id: string) => void }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="o2-preview p-0 sm:max-w-[420px] w-[420px] flex flex-col"
        style={{ background: O2.surface, color: O2.fg, borderLeft: `1px solid ${O2.lineStrong}` }}
      >
        <O2StyleScope />
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: O2.line }}>
          <div className="flex items-center justify-between mb-2">
            <span className="o2-eyebrow">Drill-down</span>
            <button onClick={onClose} className="o2-mono px-2 py-1 rounded-full" style={{ border: `1px solid ${O2.lineStrong}` }}><X className="h-3 w-3" /></button>
          </div>
          <h3 className="o2-display" style={{ fontSize: 22, margin: 0 }}>{data.title}</h3>
        </div>
        <div className="flex-1 overflow-auto py-2">
          {data.items.length === 0 && <div className="text-center py-8 text-xs" style={{ color: O2.subtle }}>Vazio.</div>}
          {data.items.map(it => (
            <button
              key={it.id}
              onClick={() => onPickDeal(it.id)}
              className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              style={{ borderBottom: `1px solid ${O2.line}` }}
            >
              <div>
                <div className="text-sm font-medium">{it.primary}</div>
                <div className="o2-mono mt-0.5">{it.secondary}</div>
              </div>
              {it.right && <div className="text-xs" style={{ color: O2.lima }}>{it.right}</div>}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ───────────── Command Palette (⌘K) ─────────────
function CommandPalette({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (target: DrillTarget) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="o2-preview max-w-xl p-0" style={{ background: O2.surface, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
        <O2StyleScope />
        <Command className="rounded-lg" style={{ background: O2.surface }}>
          <div className="flex items-center px-3 border-b" style={{ borderColor: O2.line }}>
            <Search className="h-4 w-4" style={{ color: O2.muted }} />
            <CommandInput placeholder="Buscar deal, SDR, closer..." className="border-0 focus:ring-0" />
          </div>
          <CommandList className="max-h-[400px]" style={{ background: O2.surface }}>
            <CommandEmpty className="o2-mono py-6 text-center">Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Deals">
              {Object.values(DEALS).map(d => (
                <CommandItem key={d.id} value={`deal-${d.nome}`} onSelect={() => onPick({ kind: "deal", id: d.id })}>
                  <Briefcase className="h-3.5 w-3.5 mr-2" /> {d.nome}
                  <span className="ml-auto o2-mono" style={{ color: O2.muted }}>{d.fase} · R$ {(d.mrr / 1000).toFixed(0)}k</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pessoas">
              {Object.values(PEOPLE).map(p => (
                <CommandItem key={p.id} value={`pessoa-${p.nome}-${p.role}`} onSelect={() => onPick({ kind: "person", id: p.id, role: p.role })}>
                  <Users className="h-3.5 w-3.5 mr-2" /> {p.nome}
                  <span className="ml-auto o2-mono" style={{ color: O2.muted }}>{p.role.toUpperCase()} · {p.bu}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="px-3 py-2 border-t flex items-center justify-between o2-mono" style={{ borderColor: O2.line, color: O2.subtle }}>
          <span>↑↓ navegar · Enter abrir · Esc fechar</span>
          <span>⌘K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────── Cheat sheet (?) ─────────────
function CheatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const atalhos: [string, string][] = [
    ["⌘K", "Buscar deal ou pessoa"],
    ["?", "Atalhos (esta janela)"],
    ["Esc", "Fechar drawer/dialog"],
    ["J / →", "Próximo deal"],
    ["K / ←", "Deal anterior"],
    ["1–4", "Trocar tab no drawer (Brief / Reuniões / Histórico / Dados)"],
  ];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="o2-preview max-w-md p-6" style={{ background: O2.surface, color: O2.fg, border: `1px solid ${O2.lineStrong}` }}>
        <O2StyleScope />
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="h-4 w-4" style={{ color: O2.lima }} />
          <h3 className="o2-display" style={{ fontSize: 20, margin: 0 }}>Atalhos</h3>
        </div>
        <div className="space-y-2">
          {atalhos.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between text-sm">
              <span style={{ color: O2.muted }}>{l}</span>
              <kbd className="o2-mono px-2 py-1 rounded" style={{ background: O2.elev3, border: `1px solid ${O2.lineStrong}` }}>{k}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// mock data (gráficos) — abaixo
// ═════════════════════════════════════════════════════════════════

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
          [<DealLink id="acme" label="Acme Holdings" />, "Proposta Enviada", "R$ 45k", "8d", <PersonLink id="pedro" label="Pedro Albite" />, "🔥 Quente"],
          [<DealLink id="construtora-pampa" label="Construtora Pampa" />, "Proposta Enviada", "R$ 32k", "15d", <PersonLink id="daniel-closer" label="Daniel T." />, "🔥→🟡 Esfriando"],
          [<DealLink id="tech-inova" label="Tech Inova" />, "Proposta Enviada", "R$ 28k", "18d", <PersonLink id="bruna-closer" label="Bruna" />, "🔥→🟡 Esfriando"],
          [<DealLink id="casa-viegas" label="Casa Viegas" />, "Proposta Enviada", "R$ 25k", "27d", <PersonLink id="pedro" label="Pedro Albite" />, "🟡 Morno"],
          [<DealLink id="grupo-xyz" label="Grupo XYZ" />, "Reunião Realizada", "R$ 22k", "5d", <PersonLink id="thiago" label="Thiago" />, "🟡 Morno"],
        ]}
        hint="Clique no nome do cliente para abrir Brief IA + transcrição. Clique no closer para o dossier."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <MiniTable
          title="Ranking SDR — Atingimento da meta (RM)"
          cols={["SDR", "Meta", "Real", "Atinge%", "Ritmo"]}
          rows={[
            [<PersonLink id="carlos" label="Carlos Ramos" />, 30, 15, "50% 🟡", "no pace"],
            [<PersonLink id="bruna-sdr" label="Bruna P. Mota" />, 25, 9, "36% 🔴", "atrás"],
            [<PersonLink id="erica" label="Erica Rocha" />, 20, 3, "15% 🔴", "atrás"],
            [<PersonLink id="daniel-sdr" label="Daniel Trindade" />, 15, 0, "0% 🔴", "atrás"],
          ]}
          hint="Clique no nome do SDR para o dossier individual com diagnóstico"
        />
        <MiniTable
          title="Ranking Closer — Atingimento da meta (Vendas)"
          cols={["Closer", "Meta", "Real", "Atinge%", "Ritmo"]}
          rows={[
            [<PersonLink id="pedro" label="Pedro Albite" />, 8, 6, "75% 🟢", "adiantado"],
            [<PersonLink id="bruna-closer" label="Bruna" />, 6, 4, "67% 🟡", "no pace"],
            [<PersonLink id="daniel-closer" label="Daniel Trindade" />, 6, 2, "33% 🔴", "atrás"],
            [<PersonLink id="thiago" label="Thiago" />, 5, 2, "40% 🔴", "atrás"],
          ]}
          hint="Clique no nome do Closer para ver detalhamento + top clientes"
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
          [<DealLink id="acme" label="Acme Holdings" />, "8d", "R$ 45k", <PersonLink id="pedro" label="Pedro Albite" />, "Reunião decisora 18/05"],
          [<DealLink id="casa-viegas" label="Casa Viegas" />, "27d ⚠️", "R$ 25k", <PersonLink id="pedro" label="Pedro Albite" />, "Follow-up — atrasou"],
          [<DealLink id="tech-inova" label="Tech Inova" />, "18d ⚠️", "R$ 28k", <PersonLink id="bruna-closer" label="Bruna" />, "Aguardando contraproposta"],
          [<DealLink id="construtora-pampa" label="Construtora Pampa" />, "15d", "R$ 32k", <PersonLink id="daniel-closer" label="Daniel T." />, "Renegociar valor"],
          ["+ 8 outros quentes…", "—", "—", "—", "—"],
        ]}
        accent="border-red-500/20"
        hint="Clique no nome do cliente para ver Brief IA + transcrição. Cards >14d destacados — risco de virar Loss."
      />

      <MiniTable
        title="🟡 Mornos — RR realizada, em negociação"
        cols={["Cliente", "Dias parado", "MRR", "Closer", "Próxima ação"]}
        rows={[
          [<DealLink id="grupo-xyz" label="Grupo XYZ" />, "5d", "R$ 22k", <PersonLink id="thiago" label="Thiago" />, "Enviar proposta"],
          ["Distribuidora ABC", "12d", "R$ 18k", <PersonLink id="bruna-closer" label="Bruna" />, "Reunião técnica"],
          ["+ 16 outros mornos…", "—", "—", "—", "—"],
        ]}
        accent="border-amber-500/20"
      />

      <MiniTable
        title="🔵 Frios — em qualificação (MQL + RM)"
        cols={["Cliente", "Dias parado", "MRR estimado", "SDR", "Status"]}
        rows={[
          ["Lead 142", "1d", "R$ 12k", <PersonLink id="carlos" label="Carlos Ramos" />, "RM agendada"],
          ["Lead 138", "3d", "R$ 8k", <PersonLink id="bruna-sdr" label="Bruna P.M." />, "Em qualificação"],
          ["+ 40 outros frios…", "—", "—", "—", "—"],
        ]}
        accent="border-blue-500/20"
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
          [<PersonLink id="carlos" label="Carlos Ramos" />, 30, 22, "73% 🟢", "adiantado", "82%", "32d"],
          [<PersonLink id="bruna-sdr" label="Bruna P. Mota" />, 25, 18, "72% 🟢", "no pace", "88%", "28d"],
          [<PersonLink id="erica" label="Erica Rocha" />, 20, 8, "40% 🟡", "atrás", "65%", "—"],
          [<PersonLink id="daniel-sdr" label="Daniel Trindade" />, 15, 1, "7% 🔴", "muito atrás", "—", "—"],
        ]}
        hint="Atingimento esperado pra hoje: ~67% do mês. Clique no nome para dossier individual."
      />

      <MiniTable
        title="Performance por Closer (período) — vs meta"
        cols={["Closer", "Meta", "Real", "Atinge%", "Ritmo", "Win%", "Ticket", "Ciclo"]}
        rows={[
          [<PersonLink id="pedro" label="Pedro Albite" />, 8, 6, "75% 🟢", "adiantado", "30%", "R$ 28k", "10d"],
          [<PersonLink id="bruna-closer" label="Bruna" />, 6, 4, "67% 🟡", "no pace", "27%", "R$ 22k", "9d"],
          [<PersonLink id="daniel-closer" label="Daniel Trindade" />, 6, 2, "33% 🔴", "atrás", "12%", "R$ 18k", "18d ⚠️"],
          [<PersonLink id="thiago" label="Thiago" />, 5, 2, "40% 🔴", "atrás", "15%", "R$ 15k", "14d"],
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

  // Drill-down state
  const [drawerDeal, setDrawerDeal] = useState<string | null>(null);
  const [drawerDealList, setDrawerDealList] = useState<string[]>(QUENTES_LIST);
  const [drawerPerson, setDrawerPerson] = useState<string | null>(null);
  const [sheetList, setSheetList] = useState<{ title: string; items: { id: string; primary: string; secondary: string; right?: string }[] } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);

  const drill: DrillContextValue = useMemo(() => ({
    open: (target) => {
      if (target.kind === "deal") { setDrawerDeal(target.id); setDrawerDealList(QUENTES_LIST.includes(target.id) ? QUENTES_LIST : [target.id]); }
      if (target.kind === "person") setDrawerPerson(target.id);
      if (target.kind === "list") setSheetList({ title: target.title, items: target.items });
    },
    navigateDeal: (delta) => {
      if (!drawerDeal) return;
      const idx = drawerDealList.indexOf(drawerDeal);
      const next = idx + delta;
      if (next >= 0 && next < drawerDealList.length) setDrawerDeal(drawerDealList[next]);
    },
  }), [drawerDeal, drawerDealList]);

  // Atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(p => !p); return; }
      if (isInput) return;
      if (e.key === "?") { e.preventDefault(); setCheatOpen(o => !o); }
      if (e.key === "Escape") {
        if (drawerDeal) setDrawerDeal(null);
        else if (drawerPerson) setDrawerPerson(null);
        else if (sheetList) setSheetList(null);
        else if (paletteOpen) setPaletteOpen(false);
        else if (cheatOpen) setCheatOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerDeal, drawerPerson, sheetList, paletteOpen, cheatOpen]);

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
    <DrillContext.Provider value={drill}>
    <div className="o2-preview">
      <O2StyleScope />
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="o2-eyebrow">● Preview v5 · Drill-down universal</span>
            <span className="o2-mono">Mock estático · ⌘K busca · ? atalhos</span>
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
            <strong style={{ color: O2.lima }}>v5 — Drill-down universal:</strong>
            Clique em qualquer nome de cliente para abrir o <strong>Deal Drawer</strong> com
            Brief IA + Reuniões com transcrição + Histórico + Dados.
            Clique em qualquer nome de SDR/Closer para abrir o <strong>Dossier individual</strong>.
            Use <kbd className="o2-mono px-1.5 py-0.5 rounded" style={{ background: O2.elev3, border: `1px solid ${O2.lineStrong}` }}>⌘K</kbd> para
            buscar qualquer pessoa ou deal,
            <kbd className="o2-mono px-1.5 py-0.5 rounded mx-1" style={{ background: O2.elev3, border: `1px solid ${O2.lineStrong}` }}>J/K</kbd>
            para navegar entre deals,
            <kbd className="o2-mono px-1.5 py-0.5 rounded mx-1" style={{ background: O2.elev3, border: `1px solid ${O2.lineStrong}` }}>?</kbd>
            para ver todos os atalhos.
          </p>
        </div>
      </div>

      {/* Drill-down — drawers, sheets, palette */}
      {drawerDeal && (
        <DealDrawer
          dealId={drawerDeal}
          list={drawerDealList}
          onChange={setDrawerDeal}
          onClose={() => setDrawerDeal(null)}
        />
      )}
      {drawerPerson && (
        <PessoaDrawer personId={drawerPerson} onClose={() => setDrawerPerson(null)} />
      )}
      {sheetList && (
        <ListSheet
          data={sheetList}
          onClose={() => setSheetList(null)}
          onPickDeal={(id) => { setSheetList(null); setDrawerDeal(id); setDrawerDealList(QUENTES_LIST); }}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(t) => {
          setPaletteOpen(false);
          if (t.kind === "deal") { setDrawerDeal(t.id); setDrawerDealList(QUENTES_LIST.includes(t.id) ? QUENTES_LIST : [t.id]); }
          if (t.kind === "person") setDrawerPerson(t.id);
        }}
      />
      <CheatSheet open={cheatOpen} onClose={() => setCheatOpen(false)} />

      {/* Floating ⌘K hint quando nada aberto */}
      {!drawerDeal && !drawerPerson && !sheetList && !paletteOpen && !cheatOpen && (
        <button
          onClick={() => setPaletteOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full o2-mono"
          style={{ background: O2.elev3, color: O2.fg, border: `1px solid ${O2.lineStrong}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
        >
          <Search className="h-3.5 w-3.5" style={{ color: O2.lima }} />
          Buscar
          <kbd style={{ background: O2.surface, padding: "2px 6px", borderRadius: 4, fontSize: 9 }}>⌘K</kbd>
        </button>
      )}
    </div>
    </DrillContext.Provider>
  );
}
