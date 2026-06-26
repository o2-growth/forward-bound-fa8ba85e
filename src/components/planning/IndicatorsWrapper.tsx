import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicatorsTab } from "@/components/planning/IndicatorsTab";
import { MarketingIndicatorsTab } from "@/components/planning/MarketingIndicatorsTab";
import { CeoViewTab } from "@/components/planning/CeoViewTab";
import { PessoasTab } from "@/components/planning/PessoasTab";
import { BarChart3, TrendingUp, Crown, Users } from "lucide-react";

export function IndicatorsWrapper() {
  return (
    <Tabs defaultValue="comercial" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
        <TabsTrigger value="comercial" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Comercial</span>
        </TabsTrigger>
        <TabsTrigger value="marketing" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Marketing</span>
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Visão CEO</span>
        </TabsTrigger>
        <TabsTrigger value="pessoas" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Pessoas</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="comercial" className="mt-0">
        <IndicatorsTab />
      </TabsContent>

      <TabsContent value="marketing" className="mt-0">
        <MarketingIndicatorsTab />
      </TabsContent>

      <TabsContent value="growth" className="mt-0">
        <CeoViewTab />
      </TabsContent>

      <TabsContent value="pessoas" className="mt-0">
        <PessoasTab />
      </TabsContent>
    </Tabs>
  );
}
