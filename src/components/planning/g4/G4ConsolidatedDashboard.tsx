import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Users, Target, MessageCircle, Flame, Trophy, DollarSign, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useG4RealMetrics, type G4RealLead } from "@/hooks/useG4RealMetrics";
import { fmt, fmtInt } from "@/components/planning/ceo/ceoShared";
import { DetailSheet, columnFormatters, type DetailItem } from "@/components/planning/indicators/DetailSheet";
import { cn } from "@/lib/utils";

// ─────────── helpers ───────────
const LIVE_CANONICAL_MAP: Record<string, string> = {
  "Live - G4 - 20-mai": "Live G4 - 20/05/2026",
  "Live - G4 - 21-mai": "Live G4 - 21/05/2026",
};
const canonLive = (s: string): string => LIVE_CANONICAL_MAP[s] ?? s;

const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const isLost = (fase: string | null) => {
  const n = normalize(fase);
  return n.startsWith("perdido") || n.startsWith("perda");
};
const isWon = (fase: string | null) => normalize(fase) === "ganho";
const IN_CONTACT = new Set([
  "tentativas de contato",
  "reuniao marcada",
  "reunioes marcadas",
  "reuniao realizada",
  "reunioes realizadas",
]);
const isInContact = (fase: string | null) => IN_CONTACT.has(normalize(fase));

// MQL = faturamento mensal >= R$ 200k, inferido pelo campo `faixa`
const MQL_FAIXAS = new Set([
  "entre r$ 200 mil e r$ 350 mil",
  "entre r$ 350 mil e r$ 500 mil",
  "entre r$ 500 mil e r$ 1 milhao",
  "entre r$ 1 milhao e r$ 5 milhoes",
  "acima de r$ 5 milhoes",
]);
const isMqlByFaturamento = (faixa: string | null) => MQL_FAIXAS.has(normalize(faixa));
const isLive = (name: string) => /live/i.test(name);

// Try to parse a date from the live name for sorting/filtering.
// Accepts "Live G4 - 20/05/2026", "Live - G4 - 20-mai", "17/06", etc.
const MONTHS_PT: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};
function parseEventDate(name: string): Date | null {
  const dmy = name.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmy) {
    const y = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return new Date(y, Number(dmy[2]) - 1, Number(dmy[1]));
  }
  const dm = name.match(/(\d{1,2})\/(\d{1,2})/);
  if (dm) return new Date(2026, Number(dm[2]) - 1, Number(dm[1]));
  const dMon = name.match(/(\d{1,2})[-\s](jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
  if (dMon) return new Date(2026, MONTHS_PT[dMon[2].toLowerCase()], Number(dMon[1]));
  return null;
}

interface LiveGroup {
  live: string;
  date: Date | null;
  kind: "live" | "evento";
  leads: G4RealLead[];
  inscritos: number;
  mqls: number;
  emContato: number;
  quentes: number;
  fechados: number;
  perdidos: number;
  mrr: number;
  setup: number;
  pontual: number;
  tcv: number;
  ticketMedio: number;
  wonLeads: G4RealLead[];
  lostLeads: G4RealLead[];
}

function buildGroups(leads: G4RealLead[]): LiveGroup[] {
  const byLive = new Map<string, G4RealLead[]>();
  for (const lead of leads) {
    for (const rawLive of lead.lives) {
      const live = canonLive(rawLive);
      if (!byLive.has(live)) byLive.set(live, []);
      byLive.get(live)!.push(lead);
    }
  }
  const groups: LiveGroup[] = [];
  for (const [live, list] of byLive.entries()) {
    const seen = new Set<string>();
    const uniq = list.filter((l) => {
      const k = (l.email ?? l.nome ?? "").toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const won = uniq.filter((l) => isWon(l.faseAtual));
    const lost = uniq.filter((l) => isLost(l.faseAtual));
    let mrr = 0, setup = 0, pontual = 0, tcv = 0;
    for (const w of won) {
      mrr += w.valorMRR ?? 0;
      setup += w.valorSetup ?? 0;
      pontual += w.valorPontual ?? 0;
      tcv += w.tcv ?? 0;
    }
    const ticketSum = won.reduce(
      (a, w) => a + (w.valorSetup ?? 0) + (w.valorMRR ?? 0) + (w.valorPontual ?? 0),
      0,
    );
    groups.push({
      live,
      date: parseEventDate(live),
      kind: isLive(live) ? "live" : "evento",
      leads: uniq,
      inscritos: uniq.length,
      mqls: uniq.filter((l) => isMqlByFaturamento(l.faixa)).length,
      emContato: uniq.filter((l) => isInContact(l.faseAtual)).length,
      quentes: uniq.filter((l) => l.temperatura === "Quente").length,
      fechados: won.length,
      perdidos: lost.length,
      mrr, setup, pontual, tcv,
      ticketMedio: won.length ? ticketSum / won.length : 0,
      wonLeads: won,
      lostLeads: lost,
    });
  }
  return groups.sort((a, b) => {
    if (a.date && b.date) return a.date.getTime() - b.date.getTime();
    return a.live.localeCompare(b.live);
  });
}

// ─────────── UI atoms ───────────
function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Users;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "warning"
      ? "text-orange-500 dark:text-orange-400"
      : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={cn("h-3.5 w-3.5", toneCls)} />
        </div>
        <div className={cn("mt-1 text-xl font-semibold tabular-nums", toneCls)}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MoneyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-foreground">{fmt(value)}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h5 className="text-xs font-semibold text-foreground">{title}</h5>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ─────────── Charts ───────────
const TEMP_COLORS: Record<string, string> = {
  Quente: "hsl(24 95% 53%)",
  Morno: "hsl(45 93% 47%)",
  Frio: "hsl(200 80% 55%)",
  "Sem tag": "hsl(var(--muted-foreground))",
};

function TemperaturePie({ groups }: { groups: LiveGroup[] }) {
  const data = useMemo(() => {
    const acc: Record<string, number> = { Quente: 0, Morno: 0, Frio: 0, "Sem tag": 0 };
    for (const g of groups) {
      for (const l of g.leads) {
        if (l.temperatura) acc[l.temperatura] = (acc[l.temperatura] ?? 0) + 1;
        else acc["Sem tag"]++;
      }
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [groups]);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={TEMP_COLORS[d.name]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) =>
              [`${fmtInt(v)} (${total ? Math.round((v / total) * 100) : 0}%)`, n]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function EventsBarChart({ groups }: { groups: LiveGroup[] }) {
  const data = groups.map((g) => ({
    name: g.live.replace(/Live G4 -\s*/i, "").slice(0, 14),
    Leads: g.inscritos,
    MQL: g.mqls,
    Ganho: g.fechados,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Leads" fill="hsl(var(--primary) / 0.35)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="MQL" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Ganho" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelBars({ totals }: { totals: { inscritos: number; mqls: number; emContato: number; quentes: number; fechados: number } }) {
  const steps = [
    { name: "Leads", value: totals.inscritos },
    { name: "MQL", value: totals.mqls },
    { name: "Em contato", value: totals.emContato },
    { name: "Quente", value: totals.quentes },
    { name: "Ganho", value: totals.fechados },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const conv = prev ? Math.round((s.value / prev) * 100) : 100;
        return (
          <div key={s.name}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>{s.name}</span>
              <span className="tabular-nums">
                {fmtInt(s.value)} {i > 0 && <span className="text-muted-foreground/70">· {conv}%</span>}
              </span>
            </div>
            <div className="h-6 rounded bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${pct}%`,
                  background:
                    i === steps.length - 1
                      ? "hsl(142 71% 45%)"
                      : i === steps.length - 2
                      ? "hsl(24 95% 53%)"
                      : "hsl(var(--primary))",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LostReasonsBar({ groups }: { groups: LiveGroup[] }) {
  const data = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) {
      for (const l of g.lostLeads) {
        const key = l.motivoPerda?.trim() || "— sem motivo —";
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 32 ? name.slice(0, 30) + "…" : name, value }));
  }, [groups]);
  if (data.length === 0) return <p className="text-xs text-muted-foreground">Nenhum perdido no filtro atual.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopRanking({ groups }: { groups: LiveGroup[] }) {
  const topFechados = [...groups].sort((a, b) => b.fechados - a.fechados).slice(0, 5);
  const topTcv = [...groups].sort((a, b) => b.tcv - a.tcv).slice(0, 5);
  const Row = ({ label, val }: { label: string; val: string }) => (
    <div className="flex items-center justify-between border-b last:border-b-0 py-1.5 text-xs">
      <span className="truncate text-foreground">{label}</span>
      <span className="tabular-nums font-medium text-foreground ml-2">{val}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <SectionTitle title="Top 5 · Fechados" />
        <div className="rounded-md border bg-background px-3">
          {topFechados.map((g) => <Row key={g.live} label={g.live} val={fmtInt(g.fechados)} />)}
        </div>
      </div>
      <div>
        <SectionTitle title="Top 5 · TCV" />
        <div className="rounded-md border bg-background px-3">
          {topTcv.map((g) => <Row key={g.live} label={g.live} val={fmt(g.tcv)} />)}
        </div>
      </div>
    </div>
  );
}

// ─────────── Drill-down ───────────
function ExpandedRow({ group }: { group: LiveGroup }) {
  const phaseCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of group.leads) {
      const key = l.faseAtual ?? "— sem fase —";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [group]);

  const tempCounts = useMemo(() => {
    const m = { Quente: 0, Morno: 0, Frio: 0, "Sem tag": 0 } as Record<string, number>;
    for (const l of group.leads) {
      if (l.temperatura) m[l.temperatura]++;
      else m["Sem tag"]++;
    }
    return m;
  }, [group]);

  const lostByReason = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of group.lostLeads) {
      const key = l.motivoPerda?.trim() || "— sem motivo —";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [group]);

  return (
    <div className="bg-muted/20 border-t p-4">
      <Tabs defaultValue="fases">
        <TabsList>
          <TabsTrigger value="fases">Por fase ({phaseCounts.length})</TabsTrigger>
          <TabsTrigger value="temperatura">Temperatura</TabsTrigger>
          <TabsTrigger value="perdidos">Perdidos ({group.perdidos})</TabsTrigger>
          <TabsTrigger value="vendas">Vendas ({group.fechados})</TabsTrigger>
        </TabsList>

        <TabsContent value="fases" className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {phaseCounts.map(([fase, count]) => (
              <div key={fase} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs">
                <span className="truncate text-foreground">{fase}</span>
                <span className="font-semibold tabular-nums text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="temperatura" className="mt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(tempCounts).map(([k, v]) => (
              <div key={k} className="rounded-md border bg-background p-3 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
                <div className="text-xl font-semibold tabular-nums text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="perdidos" className="mt-3 space-y-3">
          {lostByReason.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum lead perdido.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {lostByReason.map(([motivo, count]) => (
                  <div key={motivo} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs">
                    <span className="truncate text-foreground">{motivo}</span>
                    <Badge variant="destructive" className="text-[10px]">{count}</Badge>
                  </div>
                ))}
              </div>
              <LeadsTable leads={group.lostLeads} showReason />
            </>
          )}
        </TabsContent>

        <TabsContent value="vendas" className="mt-3">
          {group.wonLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma venda fechada.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <MoneyCard label="MRR" value={group.mrr} />
                <MoneyCard label="Setup" value={group.setup} />
                <MoneyCard label="Pontual" value={group.pontual} />
                <MoneyCard label="TCV" value={group.tcv} />
                <MoneyCard label="Ticket médio" value={group.ticketMedio} />
              </div>
              <LeadsTable leads={group.wonLeads} showMoney />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeadsTable({
  leads,
  showMoney = false,
  showReason = false,
}: {
  leads: G4RealLead[];
  showMoney?: boolean;
  showReason?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left">Empresa</th>
            <th className="px-2 py-1.5 text-left">Contato</th>
            <th className="px-2 py-1.5 text-left">Closer</th>
            <th className="px-2 py-1.5 text-left">Fase</th>
            {showReason && <th className="px-2 py-1.5 text-left">Motivo</th>}
            {showMoney && (
              <>
                <th className="px-2 py-1.5 text-right">MRR</th>
                <th className="px-2 py-1.5 text-right">Setup</th>
                <th className="px-2 py-1.5 text-right">Pontual</th>
                <th className="px-2 py-1.5 text-right">TCV</th>
              </>
            )}
            <th className="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {leads.map((l, i) => (
            <tr key={`${l.email ?? l.nome ?? i}-${i}`} className="border-t">
              <td className="px-2 py-1.5 text-foreground">{l.empresa ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.nome ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.closer ?? "—"}</td>
              <td className="px-2 py-1.5 text-muted-foreground">{l.faseAtual ?? "—"}</td>
              {showReason && (
                <td className="px-2 py-1.5 text-muted-foreground">{l.motivoPerda ?? "—"}</td>
              )}
              {showMoney && (
                <>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorMRR != null ? fmt(l.valorMRR) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorSetup != null ? fmt(l.valorSetup) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.valorPontual != null ? fmt(l.valorPontual) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.tcv != null ? fmt(l.tcv) : "—"}</td>
                </>
              )}
              <td className="px-2 py-1.5 text-right">
                {l.pipefyUrl && (
                  <a
                    href={l.pipefyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Pipefy <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────── Main ───────────
type KindFilter = "todos" | "live" | "evento";
type RangeFilter = "30" | "90" | "all";

export function G4ConsolidatedDashboard() {
  const { data, isLoading } = useG4RealMetrics();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<KindFilter>("todos");
  const [range, setRange] = useState<RangeFilter>("all");

  // Drill-down state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillDesc, setDrillDesc] = useState("");
  const [drillItems, setDrillItems] = useState<DetailItem[]>([]);
  const [drillMode, setDrillMode] = useState<"basic" | "money" | "lost">("basic");

  const allGroups = useMemo(() => (data ? buildGroups(data.leads) : []), [data]);

  const groups = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "30" ? now - 30 * 864e5 : range === "90" ? now - 90 * 864e5 : 0;
    return allGroups.filter((g) => {
      if (kind !== "todos" && g.kind !== kind) return false;
      if (cutoff && g.date && g.date.getTime() < cutoff) return false;
      return true;
    });
  }, [allGroups, kind, range]);

  const totals = useMemo(() => {
    const acc = { inscritos: 0, mqls: 0, emContato: 0, quentes: 0, fechados: 0, perdidos: 0, mrr: 0, setup: 0, pontual: 0, tcv: 0 };
    for (const g of groups) {
      acc.inscritos += g.inscritos;
      acc.mqls += g.mqls;
      acc.emContato += g.emContato;
      acc.quentes += g.quentes;
      acc.fechados += g.fechados;
      acc.perdidos += g.perdidos;
      acc.mrr += g.mrr;
      acc.setup += g.setup;
      acc.pontual += g.pontual;
      acc.tcv += g.tcv;
    }
    return acc;
  }, [groups]);

  const ticketMedioGeral =
    totals.fechados > 0 ? (totals.mrr + totals.setup + totals.pontual) / totals.fechados : 0;
  const convMql = totals.inscritos ? Math.round((totals.mqls / totals.inscritos) * 100) : 0;
  const closeRate = totals.inscritos ? ((totals.fechados / totals.inscritos) * 100).toFixed(1) : "0";

  const toggle = (live: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(live) ? next.delete(live) : next.add(live);
      return next;
    });

  const FilterPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 text-[11px] rounded-md border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Dashboard Consolidado G4 · Live + Evento</h4>
            <p className="text-xs text-muted-foreground">
              Visão macro com KPIs e gráficos, e micro por live/evento com drill-down por fase, temperatura, perdas e vendas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <FilterPill label="Todos" active={kind === "todos"} onClick={() => setKind("todos")} />
              <FilterPill label="Lives" active={kind === "live"} onClick={() => setKind("live")} />
              <FilterPill label="Eventos" active={kind === "evento"} onClick={() => setKind("evento")} />
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex gap-1">
              <FilterPill label="30d" active={range === "30"} onClick={() => setRange("30")} />
              <FilterPill label="90d" active={range === "90"} onClick={() => setRange("90")} />
              <FilterPill label="Tudo" active={range === "all"} onClick={() => setRange("all")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-64 rounded-md border bg-muted/20 animate-pulse" />
      ) : groups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sem dados para os filtros selecionados.</CardContent></Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <Kpi label="Leads" value={fmtInt(totals.inscritos)} icon={Users} />
            <Kpi label="MQLs ≥ R$ 200k" value={fmtInt(totals.mqls)} hint={`${convMql}% dos leads`} icon={Target} tone="primary" />
            <Kpi label="Em contato" value={fmtInt(totals.emContato)} icon={MessageCircle} />
            <Kpi label="Quentes" value={fmtInt(totals.quentes)} icon={Flame} tone="warning" />
            <Kpi label="Fechados" value={fmtInt(totals.fechados)} hint={`${closeRate}% close rate`} icon={Trophy} tone="success" />
            <Kpi label="TCV" value={fmt(totals.tcv)} icon={DollarSign} tone="success" />
            <Kpi label="Ticket médio" value={fmt(ticketMedioGeral)} icon={Ticket} />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <SectionTitle title="Funil consolidado" subtitle="Conversão etapa a etapa" />
                <FunnelBars totals={totals} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <SectionTitle title="Volume por live/evento" subtitle="Leads · MQL · Ganho" />
                <EventsBarChart groups={groups} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <SectionTitle title="Temperatura dos leads" />
                <TemperaturePie groups={groups} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <SectionTitle title="Motivos de perda · Top 6" />
                <LostReasonsBar groups={groups} />
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <Card>
            <CardContent className="p-4">
              <TopRanking groups={groups} />
            </CardContent>
          </Card>

          {/* Detailed table */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-3 border-b">
                <SectionTitle
                  title="Detalhado por live/evento"
                  subtitle="Clique em uma linha para abrir fases, temperatura, perdas e vendas"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExpanded((prev) =>
                      prev.size === groups.length ? new Set() : new Set(groups.map((g) => g.live)),
                    )
                  }
                >
                  {expanded.size === groups.length ? "Recolher todos" : "Expandir todos"}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left w-6" />
                      <th className="px-2 py-2 text-left">Live / Evento</th>
                      <th className="px-2 py-2 text-right">Leads</th>
                      <th className="px-2 py-2 text-right">MQLs</th>
                      <th className="px-2 py-2 text-right">Em contato</th>
                      <th className="px-2 py-2 text-right">Quentes</th>
                      <th className="px-2 py-2 text-right">Fechados</th>
                      <th className="px-2 py-2 text-right">Conv%</th>
                      <th className="px-2 py-2 text-right">Perdidos</th>
                      <th className="px-2 py-2 text-right">MRR</th>
                      <th className="px-2 py-2 text-right">Setup</th>
                      <th className="px-2 py-2 text-right">Pontual</th>
                      <th className="px-2 py-2 text-right">TCV</th>
                      <th className="px-2 py-2 text-right">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const isOpen = expanded.has(g.live);
                      const conv = g.inscritos ? ((g.fechados / g.inscritos) * 100).toFixed(1) : "0";
                      return (
                        <Fragment key={g.live}>
                          <tr
                            className={cn(
                              "border-t hover:bg-muted/30 cursor-pointer",
                              g.fechados > 0 && "bg-emerald-500/5",
                            )}
                            onClick={() => toggle(g.live)}
                          >
                            <td className="px-2 py-2">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </td>
                            <td className="px-2 py-2 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0",
                                    g.kind === "live"
                                      ? "border-primary/40 text-primary"
                                      : "border-orange-500/40 text-orange-600 dark:text-orange-400",
                                  )}
                                >
                                  {g.kind === "live" ? "LIVE" : "EVENTO"}
                                </Badge>
                                {g.live}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.inscritos)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.mqls)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.emContato)}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-orange-600 dark:text-orange-400">
                              {fmtInt(g.quentes)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                              {fmtInt(g.fechados)}
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{conv}%</td>
                            <td className="px-2 py-2 text-right tabular-nums text-destructive">{fmtInt(g.perdidos)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g.mrr)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g.setup)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g.pontual)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g.tcv)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmt(g.ticketMedio)}</td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={14} className="p-0">
                                <ExpandedRow group={g} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    <tr className="border-t bg-muted/40 font-semibold">
                      <td />
                      <td className="px-2 py-2 text-foreground">Total</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.inscritos)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.mqls)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.emContato)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.quentes)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.fechados)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{closeRate}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.perdidos)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.mrr)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.setup)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.pontual)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.tcv)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(ticketMedioGeral)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
