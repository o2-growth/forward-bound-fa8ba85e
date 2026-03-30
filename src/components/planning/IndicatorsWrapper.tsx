import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicatorsTab } from "@/components/planning/IndicatorsTab";
import { MarketingIndicatorsTab } from "@/components/planning/MarketingIndicatorsTab";
import { NpsTab } from "@/components/planning/NpsTab";
import { GrowthTab } from "@/components/planning/GrowthTab";
import { BarChart3, TrendingUp, SmilePlus, Rocket } from "lucide-react";

export function IndicatorsWrapper() {
  return (
    <Tabs defaultValue="comercial" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-4 mb-6">
        <TabsTrigger value="comercial" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Comercial</span>
        </TabsTrigger>
        <TabsTrigger value="marketing" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Marketing</span>
        </TabsTrigger>
        <TabsTrigger value="nps" className="gap-2">
          <SmilePlus className="h-4 w-4" />
          <span className="hidden sm:inline">NPS</span>
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Growth</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="comercial" className="mt-0">
        <IndicatorsTab />
      </TabsContent>

      <TabsContent value="marketing" className="mt-0">
        <MarketingIndicatorsTab />
      </TabsContent>

      <TabsContent value="nps" className="mt-0">
        <NpsTab />
      </TabsContent>

      <TabsContent value="growth" className="mt-0">
        <GrowthTab />
      </TabsContent>
    </Tabs>
  );
}
