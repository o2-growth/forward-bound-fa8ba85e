/**
 * DebugG4LivesCheck — Página oculta de diagnóstico das G4 Lives.
 *
 * Compara valores Oficiais (LIVES_OFICIAIS) × Pipefy (computeCounts + cardsForLive)
 * live por live. Não linkada em nenhum menu — acesso só por URL direta:
 *   /debug/g4-lives-check
 *
 * Restrita a admins (redireciona para "/" caso não seja).
 */
import { useMemo, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useModeloAtualAnalytics, type ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import { G4_LIVES, G4_EVENTOS, isCardLive, classifyG4Card, hasG4Signal } from "@/lib/g4Events";
import { cardsForLive, computeCounts } from "@/lib/g4Funnel";
import { LIVES_OFICIAIS } from "@/data/livesOfficial";

function useIsAdmin() {
  const [state, setState] = useState<"loading" | "yes" | "no">("loading");
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setState("no");
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setState(data ? "yes" : "no");
    })();
  }, []);
  return state;
}

const METRICS: { key: keyof ReturnType<typeof computeCounts>; label: string }[] = [
  { key: "inscritos", label: "Inscritos" },
  { key: "entraram", label: "Entraram" },
  { key: "mao", label: "Levantaram a mão" },
  { key: "venda", label: "Venda" },
];

function fmtDate(d?: Date | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function DebugG4LivesCheck() {
  const admin = useIsAdmin();

  // Janela ampla — cobre todas as lives cadastradas + folga.
  const from = useMemo(() => new Date("2026-05-01"), []);
  const to = useMemo(() => new Date(), []);
  const { allCards, isLoading } = useModeloAtualAnalytics(from, to);

  const liveCards = useMemo(
    () => (allCards ?? []).filter((c) => isCardLive(c)),
    [allCards],
  );

  // Cards com sinal G4 mas sem frente classificada (dedup por id, mais recente)
  const unclassifiedG4 = useMemo(() => {
    const repMap = new Map<string, ModeloAtualCard>();
    for (const c of allCards ?? []) {
      const cur = repMap.get(c.id);
      if (!cur || c.dataEntrada > cur.dataEntrada) repMap.set(c.id, c);
    }
    const out: ModeloAtualCard[] = [];
    for (const c of repMap.values()) {
      if (!classifyG4Card(c, G4_LIVES, G4_EVENTOS) && hasG4Signal(c)) out.push(c);
    }
    return out.sort((a, b) => b.dataEntrada.getTime() - a.dataEntrada.getTime());
  }, [allCards]);

  const [openLive, setOpenLive] = useState<string | null>(null);

  if (admin === "loading" || isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (admin === "no") return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">G4 Lives — Conferência Oficial × Pipefy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Diagnóstico interno. Compara <code>LIVES_OFICIAIS</code> com o que o Pipefy
          entrega via <code>cardsForLive + computeCounts</code> (mesma lógica usada como
          fallback hoje). Total de cards classificados como live no período:{" "}
          <strong>{liveCards.length}</strong>.
        </p>
      </div>

      {G4_LIVES.map((live) => {
        const oficial = LIVES_OFICIAIS[live.date] ?? {
          inscritos: 0,
          entraram: 0,
          mao: 0,
          venda: 0,
        };
        const cards = cardsForLive(liveCards, live.date, live.captureWindowDays);
        const pipefy = computeCounts(cards);
        const isOpen = openLive === live.date;

        // Dedup por id para a listagem
        const uniq = new Map<string, ModeloAtualCard>();
        for (const c of cards) {
          const cur = uniq.get(c.id);
          if (!cur || c.dataEntrada > cur.dataEntrada) uniq.set(c.id, c);
        }
        const cardsList = Array.from(uniq.values()).sort(
          (a, b) => a.dataEntrada.getTime() - b.dataEntrada.getTime(),
        );

        return (
          <div
            key={live.date}
            className="border rounded-lg p-4 bg-card"
          >
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="font-semibold text-lg">{live.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(new Date(live.date))} · janela +{live.captureWindowDays}d ·{" "}
                  {cardsList.length} card(s) atribuído(s)
                </p>
              </div>
              <button
                className="text-xs underline text-primary"
                onClick={() => setOpenLive(isOpen ? null : live.date)}
              >
                {isOpen ? "Ocultar cards" : "Ver cards do Pipefy"}
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-1">Métrica</th>
                  <th className="py-1 text-right">Oficial</th>
                  <th className="py-1 text-right">Pipefy</th>
                  <th className="py-1 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const off = oficial[m.key];
                  const pip = pipefy[m.key];
                  const delta = pip - off;
                  const deltaClr =
                    delta === 0
                      ? "text-emerald-600"
                      : delta > 0
                        ? "text-amber-600"
                        : "text-red-600";
                  return (
                    <tr key={m.key} className="border-b last:border-0">
                      <td className="py-1">{m.label}</td>
                      <td className="py-1 text-right tabular-nums">{off}</td>
                      <td className="py-1 text-right tabular-nums">{pip}</td>
                      <td className={`py-1 text-right tabular-nums ${deltaClr}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isOpen && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1 pr-2">ID</th>
                      <th className="py-1 pr-2">Título</th>
                      <th className="py-1 pr-2">Fase atual</th>
                      <th className="py-1 pr-2">Origem do lead</th>
                      <th className="py-1 pr-2">Campanha</th>
                      <th className="py-1 pr-2">Fonte</th>
                      <th className="py-1 pr-2">Entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardsList.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-1 pr-2 font-mono">{c.id}</td>
                        <td className="py-1 pr-2">{c.titulo}</td>
                        <td className="py-1 pr-2">{c.faseAtual || c.fase}</td>
                        <td className="py-1 pr-2">{c.origemLead || "-"}</td>
                        <td className="py-1 pr-2">{c.campanha || "-"}</td>
                        <td className="py-1 pr-2">{c.fonte || "-"}</td>
                        <td className="py-1 pr-2">
                          {c.dataEntrada.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                    {cardsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-2 text-center text-muted-foreground">
                          Nenhum card atribuído a essa live.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground pt-4">
        Δ verde = valores batem. Δ amarelo = Pipefy encontrou mais leads que o oficial.
        Δ vermelho = Pipefy encontrou menos (leads faltando no CRM ou fora da janela de
        captura).
      </p>
    </div>
  );
}
