import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

function inRange(iso: string | undefined, s: number, e: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= s && t <= e;
}

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
  const startTime = startDate.getTime();
  const endTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();

  const data = useMemo(() => {
    const reunioes = itemsByIndicator["rr"] || [];
    const vendas = itemsByIndicator["venda"] || [];
    const propostas = itemsByIndicator["proposta"] || [];

    // 1) Descobrir closers ativos (com pelo menos 1 reunião OU venda no período)
    const closerMap = new Map<string, string>(); // key -> display
    const bump = (arr: DetailItem[]) => {
      for (const it of arr) {
        if (!inRange(it.date, startTime, endTime)) continue;
        const raw = (it.closer || "").trim();
        if (!raw) continue;
        const k = firstNameKey(raw) || raw.toLowerCase();
        const prev = closerMap.get(k);
        if (!prev || raw.length > prev.length) closerMap.set(k, raw);
      }
    };
    bump(reunioes); bump(vendas);

    const closers = Array.from(closerMap.entries())
      .map(([key, display]) => ({ key, display }))
      .sort((a, b) => a.display.localeCompare(b.display));

    // 2) Descobrir faixas usadas
    const tierSet = new Set<string>();
    const addTiers = (arr: DetailItem[]) => {
      for (const it of arr) {
        if (!inRange(it.date, startTime, endTime)) continue;
        tierSet.add(normalizeTier(it.revenueRange));
      }
    };
    addTiers(reunioes); addTiers(vendas);

    const orderedTiers: string[] = [];
    for (const t of [...TIER_ORDER, ...INVESTMENT_TIER_ORDER]) {
      if (tierSet.has(t) && !orderedTiers.includes(t)) orderedTiers.push(t);
    }
    if (tierSet.has("Não informado")) orderedTiers.push("Não informado");

    // 3) Matriz [tier][closerKey] = {reu, ven}
    type Cell = { reu: number; ven: number };
    const matrix: Record<string, Record<string, Cell>> = {};
    for (const t of orderedTiers) {
      matrix[t] = {};
      for (const c of closers) matrix[t][c.key] = { reu: 0, ven: 0 };
    }
    for (const it of reunioes) {
      if (!inRange(it.date, startTime, endTime)) continue;
      const raw = (it.closer || "").trim(); if (!raw) continue;
      const k = firstNameKey(raw) || raw.toLowerCase();
      const t = normalizeTier(it.revenueRange);
      if (matrix[t]?.[k]) matrix[t][k].reu++;
    }
    for (const it of vendas) {
      if (!inRange(it.date, startTime, endTime)) continue;
      const raw = (it.closer || "").trim(); if (!raw) continue;
      const k = firstNameKey(raw) || raw.toLowerCase();
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
      const k = raw ? (firstNameKey(raw) || raw.toLowerCase()) : "__none__";
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

    return { closers, tiers: orderedTiers, matrix, totals, elabByCloser, teamByTier, teamTotal };
  }, [itemsByIndicator, startTime, endTime]);

  const { closers, tiers, matrix, totals, elabByCloser, teamByTier, teamTotal } = data;

  const highlightKey = highlightCloser
    ? (firstNameKey(highlightCloser) || highlightCloser.toLowerCase())
    : null;

  const periodo = `${startDate.toLocaleDateString("pt-BR")} – ${endDate.toLocaleDateString("pt-BR")}`;

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
                      <span>Reun. <b className="text-foreground">{totals[c.key].reu}</b></span>
                      <span>Vendas <b className="text-foreground">{totals[c.key].ven}</b></span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Em elaboração: <b className="text-foreground">{elab}</b>
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
                              <td key={`${t}-${c.key}-r`} className="text-right px-2 py-2 border-l">{cell.reu || <span className="text-muted-foreground/40">—</span>}</td>
                              <td key={`${t}-${c.key}-v`} className="text-right px-2 py-2">{cell.reu ? cell.ven : <span className="text-muted-foreground/40">—</span>}</td>
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
                              <td className="text-right px-2 py-2 border-l">{cell.reu || <span className="text-muted-foreground/40">—</span>}</td>
                              <td className="text-right px-2 py-2">{cell.reu ? cell.ven : <span className="text-muted-foreground/40">—</span>}</td>
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
                            <td key={`tot-${c.key}-r`} className="text-right px-2 py-2.5 border-l">{cell.reu}</td>
                            <td key={`tot-${c.key}-v`} className="text-right px-2 py-2.5">{cell.ven}</td>
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
                      <td className="text-right px-2 py-2.5 border-l">{teamTotal.reu}</td>
                      <td className="text-right px-2 py-2.5">{teamTotal.ven}</td>
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
    </Dialog>
  );
}
