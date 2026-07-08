import { useMemo, useState } from "react";
import { ShoppingBag, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fmtInt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteDreCard, type G4Dre } from "./FrenteDreCard";
import { FunnelDeluxe } from "./FunnelDeluxe";
import { LiveLeadsDialog } from "./LiveLeadsDialog";
import { useG4FunnelStages } from "@/hooks/useG4FunnelStages";
import type { ModeloAtualCard } from "@/hooks/useModeloAtualAnalytics";
import { isCardSeller } from "@/lib/g4Events";
import { cardsByStage, computeCounts, mergeStages } from "@/lib/g4Funnel";

export interface SellerSectionProps {
  leads: number;
  pipe: number;
  faturamento: number;
  leadTimeMedio?: number;
  dre: Omit<G4Dre, "custosOperacionais"> & { custosOperacionais?: number };
  cards?: ModeloAtualCard[];
}

export function SellerSection({
  leads,
  pipe,
  faturamento,
  leadTimeMedio,
  dre,
  cards = [],
}: SellerSectionProps) {
  const [dialogStage, setDialogStage] = useState<string | null>(null);

  const dreNorm: G4Dre = {
    receitaBruta: dre.receitaBruta,
    imposto: dre.imposto,
    comissaoG4: dre.comissaoG4,
    custosOperacionais: dre.custosOperacionais ?? 0,
    lucroLiquido: dre.lucroLiquido,
  };

  const sellerCards = useMemo(
    () => cards.filter((c) => isCardSeller(c)),
    [cards],
  );

  const { data: dbStages = [] } = useG4FunnelStages("seller", null);
  const counts = useMemo(() => computeCounts(sellerCards), [sellerCards]);
  const stages = useMemo(
    () => mergeStages("seller", counts, dbStages),
    [counts, dbStages],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Seller</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      <Card className="border-dashed border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-2 py-3 px-4">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Configuração pendente:</strong> O campo{" "}
            <code>origemLead = &quot;G4 SELLER&quot;</code> ainda precisa ser
            configurado no Pipefy. Enquanto isso, leads com{" "}
            <code>paginaOrigem</code> contendo <code>tools.g4business.com</code>{" "}
            são classificados como G4 Seller (fallback).
          </p>
        </CardContent>
      </Card>

      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      <FunnelDeluxe
        title="Funil de Conversão · G4 Seller"
        subtitle="Da entrada no funil ao fechamento — canal G4 Seller."
        chips={[{ id: "all", label: "Agregado · canal Seller" }]}
        selectedChip="all"
        onChipChange={() => {}}
        kpis={{
          inscritos: counts.inscritos,
          entraram: counts.entraram,
          mao: counts.mao,
          venda: counts.venda,
        }}
        stages={stages}
        contextLabel="Canal G4 Seller"
        contextSub="Consolidado"
        onStageClick={setDialogStage}
      />

      <FrenteDreCard title="P&L — G4 Seller" dre={dreNorm} />

      <LiveLeadsDialog
        open={dialogStage !== null}
        onOpenChange={(o) => !o && setDialogStage(null)}
        stageKey={dialogStage ?? ""}
        stageLabel={stages.find((s) => s.key === dialogStage)?.label ?? ""}
        contextLabel="Canal G4 Seller"
        totalOfficial={
          dialogStage === "mao"
            ? counts.mao
            : dialogStage === "venda"
              ? counts.venda
              : dialogStage === "entraram"
                ? counts.entraram
                : dialogStage === "inscritos"
                  ? counts.inscritos
                  : 0
        }
        cards={dialogStage ? cardsByStage(sellerCards, dialogStage) : []}
      />
    </div>
  );
}
