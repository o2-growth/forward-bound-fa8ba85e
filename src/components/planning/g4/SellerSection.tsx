import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Info } from "lucide-react";
import { fmtInt } from "@/components/planning/ceo/ceoShared";
import { FrenteMetricsRow } from "./FrenteMetricsRow";
import { FrenteFunnelCard, type FunnelStep } from "./FrenteFunnelCard";
import { FrenteDreCard, type G4Dre } from "./FrenteDreCard";

// ── Tipos ──────────────────────────────────────────────────────────────
export interface SellerSectionProps {
  // Métricas agregadas da frente G4 Seller
  leads: number;
  pipe: number;
  faturamento: number;
  leadTimeMedio?: number;
  funnel: FunnelStep[];
  // DRE sem custosDetalhe (canal Seller tipicamente sem custos operacionais diretos)
  dre: Omit<G4Dre, "custosOperacionais"> & { custosOperacionais?: number };
}

// ── Componente ─────────────────────────────────────────────────────────
export function SellerSection({
  leads,
  pipe,
  faturamento,
  leadTimeMedio,
  funnel,
  dre,
}: SellerSectionProps) {
  // Normaliza custosOperacionais para 0 quando não informado (canal Seller)
  const dreNorm: G4Dre = {
    receitaBruta: dre.receitaBruta,
    imposto: dre.imposto,
    comissaoG4: dre.comissaoG4,
    custosOperacionais: dre.custosOperacionais ?? 0,
    lucroLiquido: dre.lucroLiquido,
  };

  return (
    <div className="space-y-4">
      {/* Header frente */}
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">G4 Seller</h3>
        <Badge variant="secondary">{fmtInt(leads)} leads</Badge>
      </div>

      {/* Aviso sobre configuração de campo no Pipefy */}
      <Card className="border-dashed border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-2 py-3 px-4">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Configuração pendente:</strong> O campo <code>origemLead = &quot;G4 SELLER&quot;</code> ainda
            precisa ser configurado no Pipefy. Enquanto isso, leads com{" "}
            <code>paginaOrigem</code> contendo <code>tools.g4business.com</code> são
            classificados como G4 Seller automaticamente (fallback).
          </p>
        </CardContent>
      </Card>

      {/* Métricas agregadas */}
      <FrenteMetricsRow
        leads={leads}
        pipe={pipe}
        faturamento={faturamento}
        leadTimeMedio={leadTimeMedio}
      />

      {/* Grid: Funil + DRE */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FrenteFunnelCard
          title="Funil — G4 Seller"
          funnel={funnel}
          leadTimeMedioDias={leadTimeMedio}
        />
        <FrenteDreCard
          title="P&L — G4 Seller"
          dre={dreNorm}
          // Sem custosDetalhe — canal Seller não tem custos operacionais diretos
        />
      </div>
    </div>
  );
}
