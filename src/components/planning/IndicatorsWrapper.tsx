import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndicatorsTab } from "@/components/planning/IndicatorsTab";
import { MarketingIndicatorsTab } from "@/components/planning/MarketingIndicatorsTab";
import { GrowthTab } from "@/components/planning/GrowthTab";
import { TypeformDashboard } from "@/components/planning/typeform/TypeformDashboard";
import { TypeformVsIATab } from "@/components/planning/typeform/TypeformVsIATab";
import { InsightsPage } from "@/components/planning/insights/InsightsPage";
import { BarChart3, TrendingUp, Rocket, GitBranch, FileText, Swords, Sparkles } from "lucide-react";

export function IndicatorsWrapper() {
  return (
    <Tabs defaultValue="comercial" className="w-full">
      <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
        <TabsTrigger value="comercial" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Comercial</span>
        </TabsTrigger>
        <TabsTrigger value="marketing" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Marketing</span>
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Growth</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="comercial" className="mt-0">
        <Tabs defaultValue="funil" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="funil" className="gap-2">
              <GitBranch className="h-4 w-4" />
              <span>Funil & Metas</span>
            </TabsTrigger>
            <TabsTrigger value="typeform" className="gap-2">
              <FileText className="h-4 w-4" />
              <span>Typeform</span>
            </TabsTrigger>
            <TabsTrigger value="vs-ia" className="gap-2">
              <Swords className="h-4 w-4" />
              <span>Typeform vs IA</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="funil" className="mt-0">
            <IndicatorsTab />
          </TabsContent>
          <TabsContent value="typeform" className="mt-0">
            <TypeformDashboard />
          </TabsContent>
          <TabsContent value="vs-ia" className="mt-0">
            <TypeformVsIATab />
          </TabsContent>
          <TabsContent value="insights" className="mt-0">
            <InsightsPage />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="marketing" className="mt-0">
        <MarketingIndicatorsTab />
      </TabsContent>

      <TabsContent value="growth" className="mt-0">
        <GrowthTab />
      </TabsContent>
    </Tabs>
  );
}

