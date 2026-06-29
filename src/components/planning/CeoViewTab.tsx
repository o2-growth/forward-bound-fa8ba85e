import { useState } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DateRangePickerGA } from "./DateRangePickerGA";
import { ComercialSection } from "./ceo/ComercialSection";
import { PessoalSection } from "./ceo/PessoalSection";
import { FinanceiroSection } from "./ceo/FinanceiroSection";
import { DreSection } from "./ceo/DreSection";
import { CaixaSection } from "./ceo/CaixaSection";
import { ShoppingCart, Users, Wallet, FileSpreadsheet, Banknote, Printer, Info } from "lucide-react";

const TABS = [
  { key: "comercial", label: "Comercial", icon: ShoppingCart },
  { key: "pessoal", label: "Pessoal", icon: Users },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "dre", label: "DRE", icon: FileSpreadsheet },
  { key: "caixa", label: "Caixa", icon: Banknote },
];

export function CeoViewTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const periodLabel = `${format(dateRange.from, "dd/MM/yyyy")} – ${format(dateRange.to, "dd/MM/yyyy")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Visão do CEO</h2>
          <p className="text-sm text-muted-foreground">Relatório executivo — Comercial, Pessoal, Financeiro, DRE e Caixa · {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Relatório (PDF)
          </Button>
          <DateRangePickerGA
            startDate={dateRange.from}
            endDate={dateRange.to}
            onDateChange={(start, end) => setDateRange({ from: start, to: end })}
          />
        </div>
      </div>

      {/* Disclaimer: nota explicativa por IA */}
      <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/30 bg-primary/[0.03] p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Cada bloco tem espaço para uma <strong>nota explicativa / análise comportamental</strong> do número (botão “Gerar análise”).
          A IA será conectada em seguida. O “i” em cada indicador mostra a fonte do dado para conferência.
        </span>
      </div>

      <Tabs defaultValue="comercial" className="w-full">
        <TabsList className="grid w-full max-w-2xl" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="comercial" className="mt-6"><ComercialSection dateRange={dateRange} /></TabsContent>
        <TabsContent value="pessoal" className="mt-6"><PessoalSection dateRange={dateRange} /></TabsContent>
        <TabsContent value="financeiro" className="mt-6"><FinanceiroSection dateRange={dateRange} /></TabsContent>
        <TabsContent value="dre" className="mt-6"><DreSection dateRange={dateRange} /></TabsContent>
        <TabsContent value="caixa" className="mt-6"><CaixaSection dateRange={dateRange} /></TabsContent>
      </Tabs>
    </div>
  );
}
