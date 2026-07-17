import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { G4RealSection } from "./g4/G4RealSection";

/**
 * G4Tab — Dashboard da parceria G4 Educação.
 *
 * Após limpeza, o painel expõe apenas a visão "Reais" (fonte externa:
 * inscritos + presença + levantada de mão + diagnóstico + Pipe).
 *
 * As antigas sub-abas (Overview / Lives / Eventos / Seller) foram removidas
 * porque dependiam de classificação heurística (origemLead/paginaOrigem) e
 * de custos ainda não calibrados — produziam números não confiáveis.
 * Quando o Pipefy expuser `origemLead = "G4 SELLER"` e os custos reais
 * dos eventos forem cadastrados, reintroduziremos as frentes.
 */
export function G4Tab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Dashboard G4
            </h2>
            <Badge variant="secondary" className="text-xs">
              Parceria G4 Educação
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Funil real das lives G4: inscritos → presentes → levantaram a mão → diagnóstico → pipe → venda.
          </p>
        </div>
      </div>

      <G4RealSection />
    </div>
  );
}
