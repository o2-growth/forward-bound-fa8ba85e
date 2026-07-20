import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { DetailItem } from "./DetailSheet";
import { normalizeTier, TIER_ORDER, INVESTMENT_TIER_ORDER } from "@/lib/revenueTiers";
import { firstNameKey } from "@/hooks/useCloserAbsoluteMetas";

interface Props {
  open: boolean;
  onClose: () => void;
  itemsByIndicator: Record<string, DetailItem[]>;
  startDate: Date;
  endDate: Date;
  highlightCloser?: string;
}

// Cores estáveis por closer (hash simples)
const CLOSER_COLORS = [
  "#2a78d6", "#1baf7a", "#eda100", "#a855f7",
  "#ef4444", "#0ea5e9", "#ec4899", "#84cc16",
];
function closerColor(idx: number) { return CLOSER_COLORS[idx % CLOSER_COLORS.length]; }

const NONE_KEY = "__none__";
const NONE_DISPLAY = "Sem Closer";

function pct(n: number, d: number): number {
  if (!d) return 0;
  return (n / d) * 100;
}

function fmtPct(v: number): string {
  if (!isFinite(v) || v === 0) return "0%";
  return `${v.toFixed(1).replace(".", ",")}%`;
}

export function CloserPerformanceMatrix({
  open, onClose, itemsByIndicator, startDate, endDate, highlightCloser,
}: Props) {
  const data = useMemo(() => {
    // Items already filtered upstream (BU/closer/SDR/origem/período) — não refiltrar aqui.
    const reunioes = itemsByIndicator["rr"] || [];
    const vendas = itemsByIndicator["venda"] || [];
    const propostas = itemsByIndicator["proposta"] || [];

    // 1) Closers ativos (com pelo menos 1 reunião OU venda). Sem Closer vira balde próprio.
    const closerMap = new Map<string, string>();
    let hasNoCloser = false;
    const bump = (arr: DetailItem[]) => {
      for (const it of arr) {
        const raw = (it.closer || "").trim();
        if (!raw) { hasNoCloser = true; continue; }
        const k = firstNameKey(raw) || raw.toLowerCase();
        const prev = closerMap.get(k);
        if (!prev || raw.length > prev.length) closerMap.set(k, raw);
      }
    };
    bump(reunioes); bump(vendas);

    const closers = Array.from(closerMap.entries())
      .map(([key, display]) => ({ key, display }))
      .sort((a, b) => a.display.localeCompare(b.display));
    if (hasNoCloser) closers.push({ key: NONE_KEY, display: NONE_DISPLAY });

    // 2) Faixas usadas
    const tierSet = new Set<string>();
    const addTiers = (arr: DetailItem[]) => {
      for (const it of arr) tierSet.add(normalizeTier(it.revenueRange));
    };
    addTiers(reunioes); addTiers(vendas);

    const orderedTiers: string[] = [];
    for (const t of [...TIER_ORDER, ...INVESTMENT_TIER_ORDER]) {
      if (tierSet.has(t) && !orderedTiers.includes(t)) orderedTiers.push(t);
    }
    if (tierSet.has("Não informado")) orderedTiers.push("Não informado");

    // 3) Matriz
    type Cell = { reu: number; ven: number };
    const matrix: Record<string, Record<string, Cell>> = {};
    for (const t of orderedTiers) {
      matrix[t] = {};
      for (const c of closers) matrix[t][c.key] = { reu: 0, ven: 0 };
    }
    const keyOf = (raw: string) => raw ? (firstNameKey(raw) || raw.toLowerCase()) : NONE_KEY;
    for (const it of reunioes) {
      const k = keyOf((it.closer || "").trim());
      const t = normalizeTier(it.revenueRange);
      if (matrix[t]?.[k]) matrix[t][k].reu++;
    }
    for (const it of vendas) {
      const k = keyOf((it.closer || "").trim());
      const t = normalizeTier(it.revenueRange);
      if (matrix[t]?.[k]) matrix[t][k].ven++;
    }

    // 4) Totais por closer
    const totals: Record<string, Cell> = {};
    for (const c of closers) totals[c.key] = { reu: 0, ven: 0 };
    for (const t of orderedTiers) {
      for (const c of closers) {
        totals[c.key].reu += matrix[t][c.key].reu;
        totals[c.key].ven += matrix[t][c.key].ven;
      }
    }

    // 5) Contratos em elaboração (via itens de proposta com fase elaboração)
    const elabByCloser: Record<string, DetailItem[]> = {};
    const seen = new Set<string>();
    for (const it of propostas) {
      const ph = (it.phase || "").toLowerCase();
      if (!ph.includes("elabora")) continue;
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      const raw = (it.closer || "").trim();
      const k = keyOf(raw);
      if (!elabByCloser[k]) elabByCloser[k] = [];
      elabByCloser[k].push(it);
    }

    // 6) Totais equipe por tier
    const teamByTier: Record<string, Cell> = {};
    for (const t of orderedTiers) {
      const cell = { reu: 0, ven: 0 };
      for (const c of closers) {
        cell.reu += matrix[t][c.key].reu;
        cell.ven += matrix[t][c.key].ven;
      }
      teamByTier[t] = cell;
    }
    const teamTotal: Cell = { reu: 0, ven: 0 };
    for (const c of closers) { teamTotal.reu += totals[c.key].reu; teamTotal.ven += totals[c.key].ven; }

    if (typeof window !== "undefined") {
      // Diagnóstico: total de reuniões que a matriz enxerga (deve bater com o acelerômetro RR)
      // eslint-disable-next-line no-console
      console.debug("[CloserMatrix] reuniões=", reunioes.length, "vendas=", vendas.length, "semCloser=", (reunioes.filter(r => !(r.closer || "").trim())).length);
    }

    return { closers, tiers: orderedTiers, matrix, totals, elabByCloser, teamByTier, teamTotal };
  }, [itemsByIndicator]);

  const { closers, tiers, matrix, totals, elabByCloser, teamByTier, teamTotal } = data;

  const highlightKey = highlightCloser
    ? (firstNameKey(highlightCloser) || highlightCloser.toLowerCase())
    : null;

  const periodo = `${startDate.toLocaleDateString("pt-BR")} – ${endDate.toLocaleDateString("pt-BR")}`;

  // ---- Drill-down state ----
  type DrillKind = "rr" | "venda" | "elab";
  type Drill = { kind: DrillKind; tier: string | null; closerKey: string | null };
  const [drill, setDrill] = useState<Drill | null>(null);

  const keyOf = (raw: string) => raw ? (firstNameKey(raw) || raw.toLowerCase()) : NONE_KEY;

  const drillItems = useMemo<DetailItem[]>(() => {
    if (!drill) return [];
    const base = drill.kind === "rr" ? (itemsByIndicator["rr"] || [])
      : drill.kind === "venda" ? (itemsByIndicator["venda"] || [])
      : (itemsByIndicator["proposta"] || []).filter(it => (it.phase || "").toLowerCase().includes("elabora"));
    return base.filter(it => {
      const okTier = drill.tier == null || normalizeTier(it.revenueRange) === drill.tier;
      const okCloser = drill.closerKey == null || keyOf((it.closer || "").trim()) === drill.closerKey;
      return okTier && okCloser;
    });
  }, [drill, itemsByIndicator]);

  const openDrill = (kind: DrillKind, count: number, tier: string | null, closerKey: string | null) => {
    if (!count) return;
    setDrill({ kind, tier, closerKey });
  };

  const closerLabel = (k: string | null) => {
    if (!k) return "Equipe";
    const c = closers.find(x => x.key === k);
    return c?.display || "—";
  };
  const kindLabel = (k: DrillKind) => k === "rr" ? "Reuniões" : k === "venda" ? "Vendas" : "Em elaboração";

  const clickableCls = "cursor-pointer hover:bg-primary/10 rounded transition-colors";


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Performance de Closers — conversão por faixa de faturamento</DialogTitle>
          <DialogDescription>
            {periodo} · {teamTotal.reu} reuniões · {teamTotal.ven} vendas
            {highlightCloser && <> · destaque: <strong>{highlightCloser}</strong></>}
          </DialogDescription>
        </DialogHeader>

        {closers.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Nenhum closer com reuniões ou vendas no período/filtros selecionados.
          </div>
        ) : (
          <>
            {/* KPI tiles */}
            <div className="grid gap-3 mt-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}>
              {closers.map((c, i) => {
                const conv = pct(totals[c.key].ven, totals[c.key].reu);
                const elab = elabByCloser[c.key]?.length || 0;
                const projConv = elab > 0
                  ? pct(totals[c.key].ven + elab, totals[c.key].reu)
                  : null;
                const isHl = highlightKey === c.key;
                return (
                  <div
                    key={c.key}
                    className={`rounded-lg border p-4 bg-card ${isHl ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: closerColor(i) }} />
                      {c.display}
                    </div>
                    <div className="mt-2 text-3xl font-semibold tabular-nums">
                      {fmtPct(conv)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">conv.</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground flex gap-3 flex-wrap">
                      <span>Reun. {totals[c.key].reu ? (
                        <button type="button" className={`px-1 ${clickableCls} text-foreground font-semibold`} onClick={() => openDrill("rr", totals[c.key].reu, null, c.key)}>{totals[c.key].reu}</button>
                      ) : <b className="text-foreground">0</b>}</span>
                      <span>Vendas {totals[c.key].ven ? (
                        <button type="button" className={`px-1 ${clickableCls} text-foreground font-semibold`} onClick={() => openDrill("venda", totals[c.key].ven, null, c.key)}>{totals[c.key].ven}</button>
                      ) : <b className="text-foreground">0</b>}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Em elaboração: {elab ? (
                        <button type="button" className={`px-1 ${clickableCls} text-foreground font-semibold`} onClick={() => openDrill("elab", elab, null, c.key)}>{elab}</button>
                      ) : <b className="text-foreground">0</b>}
                      {projConv !== null && (
                        <> (viraria <b className="text-foreground">{fmtPct(projConv)}</b> se fechados)</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matriz */}
            <div className="mt-6 rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground min-w-[180px]">Faixa de faturamento</th>
                      {closers.map((c, i) => (
                        <th key={c.key} colSpan={3} className="px-2 py-2 text-center font-semibold border-l">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: closerColor(i) }} />
                            {c.display}
                          </span>
                        </th>
                      ))}
                      <th colSpan={3} className="px-2 py-2 text-center font-semibold border-l">Equipe</th>
                    </tr>
                    <tr className="border-b bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th></th>
                      {[...closers, { key: "__team__", display: "Equipe" }].map((c) => (
                        <>
                          <th key={`${c.key}-r`} className="text-right px-2 py-1.5 border-l font-medium">Reun.</th>
                          <th key={`${c.key}-v`} className="text-right px-2 py-1.5 font-medium">Vendas</th>
                          <th key={`${c.key}-p`} className="text-right px-2 py-1.5 font-medium">% Fech.</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t) => (
                      <tr key={t} className="border-b last:border-b-0 hover:bg-muted/10">
                        <td className="px-3 py-2 text-left font-medium text-muted-foreground">{t}</td>
                        {closers.map((c, i) => {
                          const cell = matrix[t][c.key];
                          const p = pct(cell.ven, cell.reu);
                          return (
                            <>
                              <td key={`${t}-${c.key}-r`} className="text-right px-2 py-2 border-l">
                                {cell.reu ? (
                                  <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("rr", cell.reu, t, c.key)} title="Ver cards">{cell.reu}</button>
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td key={`${t}-${c.key}-v`} className="text-right px-2 py-2">
                                {cell.reu ? (
                                  cell.ven ? (
                                    <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("venda", cell.ven, t, c.key)} title="Ver cards">{cell.ven}</button>
                                  ) : cell.ven
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td key={`${t}-${c.key}-p`} className="text-right px-2 py-2">
                                {cell.reu ? (
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    <span className="inline-block w-8 h-1.5 rounded bg-muted overflow-hidden">
                                      <span className="block h-full rounded" style={{ width: `${Math.min(100, p)}%`, background: closerColor(i) }} />
                                    </span>
                                    <b className="min-w-[36px] text-right">{fmtPct(p)}</b>
                                  </span>
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            </>
                          );
                        })}
                        {/* Equipe */}
                        {(() => {
                          const cell = teamByTier[t];
                          const p = pct(cell.ven, cell.reu);
                          return (
                            <>
                              <td className="text-right px-2 py-2 border-l">
                                {cell.reu ? (
                                  <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("rr", cell.reu, t, null)} title="Ver cards">{cell.reu}</button>
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="text-right px-2 py-2">
                                {cell.reu ? (
                                  cell.ven ? (
                                    <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("venda", cell.ven, t, null)} title="Ver cards">{cell.ven}</button>
                                  ) : cell.ven
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="text-right px-2 py-2">
                                {cell.reu ? (
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    <span className="inline-block w-8 h-1.5 rounded bg-muted overflow-hidden">
                                      <span className="block h-full rounded bg-foreground/60" style={{ width: `${Math.min(100, p)}%` }} />
                                    </span>
                                    <b className="min-w-[36px] text-right">{fmtPct(p)}</b>
                                  </span>
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                    {/* Total */}
                    <tr className="border-t-2 border-foreground/30 font-semibold bg-muted/20">
                      <td className="px-3 py-2.5">Total</td>
                      {closers.map((c, i) => {
                        const cell = totals[c.key];
                        const p = pct(cell.ven, cell.reu);
                        return (
                          <>
                            <td key={`tot-${c.key}-r`} className="text-right px-2 py-2.5 border-l">
                              {cell.reu ? (
                                <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("rr", cell.reu, null, c.key)} title="Ver cards">{cell.reu}</button>
                              ) : cell.reu}
                            </td>
                            <td key={`tot-${c.key}-v`} className="text-right px-2 py-2.5">
                              {cell.ven ? (
                                <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("venda", cell.ven, null, c.key)} title="Ver cards">{cell.ven}</button>
                              ) : cell.ven}
                            </td>
                            <td key={`tot-${c.key}-p`} className="text-right px-2 py-2.5">
                              <span className="inline-flex items-center gap-1.5 justify-end">
                                <span className="inline-block w-8 h-1.5 rounded bg-muted overflow-hidden">
                                  <span className="block h-full rounded" style={{ width: `${Math.min(100, p)}%`, background: closerColor(i) }} />
                                </span>
                                <b className="min-w-[36px] text-right">{fmtPct(p)}</b>
                              </span>
                            </td>
                          </>
                        );
                      })}
                      <td className="text-right px-2 py-2.5 border-l">
                        {teamTotal.reu ? (
                          <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("rr", teamTotal.reu, null, null)} title="Ver cards">{teamTotal.reu}</button>
                        ) : teamTotal.reu}
                      </td>
                      <td className="text-right px-2 py-2.5">
                        {teamTotal.ven ? (
                          <button type="button" className={`px-1.5 ${clickableCls}`} onClick={() => openDrill("venda", teamTotal.ven, null, null)} title="Ver cards">{teamTotal.ven}</button>
                        ) : teamTotal.ven}
                      </td>
                      <td className="text-right px-2 py-2.5">
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          <span className="inline-block w-8 h-1.5 rounded bg-muted overflow-hidden">
                            <span className="block h-full rounded bg-foreground/60" style={{ width: `${Math.min(100, pct(teamTotal.ven, teamTotal.reu))}%` }} />
                          </span>
                          <b className="min-w-[36px] text-right">{fmtPct(pct(teamTotal.ven, teamTotal.reu))}</b>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Contratos em elaboração */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Contratos em elaboração — visão separada</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Negócios em fase de contrato que ainda não contam como venda</p>
              <div className="rounded-lg border p-4 bg-card">
                {Object.values(elabByCloser).flat().length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhum contrato em elaboração no período.</div>
                ) : (
                  <ul className="divide-y">
                    {closers.map((c, i) => (elabByCloser[c.key] || []).map((it) => (
                      <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="font-medium">{it.company || it.name}</span>
                        <span className="text-xs text-muted-foreground">
                          · {normalizeTier(it.revenueRange)}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: closerColor(i) }} />
                          {c.display}
                        </span>
                      </li>
                    )))}
                    {(elabByCloser["__none__"] || []).map((it) => (
                      <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="font-medium">{it.company || it.name}</span>
                        <span className="text-xs text-muted-foreground">· {normalizeTier(it.revenueRange)}</span>
                        <span className="ml-auto text-xs text-muted-foreground">Sem Closer</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
              <b className="text-foreground/80">Critérios:</b> Reunião = card em Reuniões Realizadas no período.
              Venda = fase "Ganho" ou "Contrato assinado". Contratos em elaboração são exibidos separadamente e não contam como venda.
              Filtros ativos do dashboard (BU, período, SDR, origem) são respeitados.
            </div>
          </>
        )}
      </DialogContent>

      {/* Drill-down: cards por trás de cada célula */}
      <Sheet open={!!drill} onOpenChange={(o) => { if (!o) setDrill(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {drill && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {kindLabel(drill.kind)}
                  {drill.tier && <> · {drill.tier}</>}
                  {" · "}{closerLabel(drill.closerKey)}
                  <span className="ml-2 text-muted-foreground font-normal">({drillItems.length})</span>
                </SheetTitle>
                <SheetDescription>{periodo}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 divide-y">
                {drillItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">Nenhum card.</div>
                ) : drillItems.map((it) => {
                  const pipefyUrl = `https://app.pipefy.com/open-cards/${it.id}`;
                  const dateStr = it.date ? new Date(it.date).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={it.id} className="py-2.5 text-sm flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{it.company || it.name || "—"}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          <span>{normalizeTier(it.revenueRange)}</span>
                          <span>· Closer: {(it.closer || "").trim() || "Sem Closer"}</span>
                          {it.sdr && <span>· SDR: {it.sdr}</span>}
                          <span>· {dateStr}</span>
                        </div>
                      </div>
                      <a
                        href={pipefyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        title="Abrir no Pipefy"
                      >
                        Pipefy <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}

