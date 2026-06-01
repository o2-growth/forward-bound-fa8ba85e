import { useState } from "react";
import { startOfMonth, endOfDay, endOfMonth, subMonths } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePickerGA } from "@/components/planning/DateRangePickerGA";
import { InsightsTab } from "@/components/planning/indicators/InsightsTab";

export function InsightsPage() {
  const queryClient = useQueryClient();
  const today = new Date();
  // Nos primeiros 7 dias do mês ainda não há volume suficiente — cai no mês anterior completo.
  const useLastMonth = today.getDate() <= 7;
  const baseRef = useLastMonth ? subMonths(today, 1) : today;
  const [startDate, setStartDate] = useState<Date>(startOfMonth(baseRef));
  const [endDate, setEndDate] = useState<Date>(useLastMonth ? endOfMonth(baseRef) : endOfDay(today));

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["modelo-atual-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["o2-tax-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["expansao-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["outbound-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["consolidated-metas"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Insights Comerciais</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Diagnóstico automático e alertas inteligentes — consolidado de Modelo Atual, O2 TAX, Expansão e Outbound
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DateRangePickerGA
            startDate={startDate}
            endDate={endDate}
            onDateChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <InsightsTab buKey="all" startDate={startDate} endDate={endDate} />
    </div>
  );
}
