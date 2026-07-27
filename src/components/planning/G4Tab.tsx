import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { G4ConsolidatedDashboard } from "./g4/G4ConsolidatedDashboard";

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
            Visão consolidada por categoria (lives, palestras, eventos): leads, MQLs, em contato,
            quentes, fechados, perdidos e receita gerada.
          </p>
        </div>
      </div>

      <G4ConsolidatedDashboard />
    </div>
  );
}
