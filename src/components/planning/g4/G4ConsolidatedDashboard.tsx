import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useG4RealMetrics, type G4RealLead } from "@/hooks/useG4RealMetrics";
import { fmt, fmtInt } from "@/components/planning/ceo/ceoShared";

// Same canonicalization used in G4RealSection
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

interface LiveGroup {
  live: string;
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
    // Dedup por e-mail dentro da live (mesmo lead pode aparecer 2x)
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
      (acc, w) => acc + (w.valorSetup ?? 0) + (w.valorMRR ?? 0) + (w.valorPontual ?? 0),
      0,
    );
    groups.push({
      live,
      leads: uniq,
      inscritos: uniq.length,
      mqls: uniq.filter((l) => l.levantouMao).length,
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
  return groups.sort((a, b) => a.live.localeCompare(b.live));
}

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
              <div
                key={fase}
                className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs"
              >
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
                  <div
                    key={motivo}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs"
                  >
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

function MoneyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-foreground">{fmt(value)}</div>
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

export function G4ConsolidatedDashboard() {
  const { data, isLoading } = useG4RealMetrics();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => (data ? buildGroups(data.leads) : []), [data]);

  const totals = useMemo(() => {
    const acc = {
      inscritos: 0, mqls: 0, emContato: 0, quentes: 0, fechados: 0, perdidos: 0,
      mrr: 0, setup: 0, pontual: 0, tcv: 0,
    };
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

  const toggle = (live: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(live)) next.delete(live);
      else next.add(live);
      return next;
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Dashboard Consolidado (Live + Evento)
            </h4>
            <p className="text-xs text-muted-foreground">
              Uma linha por live/evento. Clique para expandir por fase, temperatura, perdas e vendas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExpanded((prev) =>
                prev.size === groups.length ? new Set() : new Set(groups.map((g) => g.live)),
              )
            }
            disabled={groups.length === 0}
          >
            {expanded.size === groups.length && groups.length > 0 ? "Recolher todos" : "Expandir todos"}
          </Button>
        </div>

        {isLoading ? (
          <div className="h-32 rounded-md border bg-muted/20 animate-pulse mx-4 mb-4" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left w-6" />
                  <th className="px-2 py-2 text-left">Live / Evento</th>
                  <th className="px-2 py-2 text-right">Leads</th>
                  <th className="px-2 py-2 text-right">MQLs</th>
                  <th className="px-2 py-2 text-right">Em contato</th>
                  <th className="px-2 py-2 text-right">Quentes</th>
                  <th className="px-2 py-2 text-right">Fechados</th>
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
                  return (
                    <Fragment key={g.live}>
                      <tr
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggle(g.live)}
                      >
                        <td className="px-2 py-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-2 py-2 font-medium text-foreground">{g.live}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.inscritos)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.mqls)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtInt(g.emContato)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-orange-600 dark:text-orange-400">
                          {fmtInt(g.quentes)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {fmtInt(g.fechados)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-destructive">
                          {fmtInt(g.perdidos)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(g.mrr)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(g.setup)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(g.pontual)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(g.tcv)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(g.ticketMedio)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={13} className="p-0">
                            <ExpandedRow group={g} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {groups.length > 0 && (
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td />
                    <td className="px-2 py-2 text-foreground">Total</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.inscritos)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.mqls)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.emContato)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.quentes)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.fechados)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmtInt(totals.perdidos)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.mrr)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.setup)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.pontual)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(totals.tcv)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {fmt(totals.fechados ? (totals.mrr + totals.setup + totals.pontual) / totals.fechados : 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
