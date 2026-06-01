import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, GitBranch, TrendingUp, XCircle, PieChart } from "lucide-react";
import { PipelineTab } from "./PipelineTab";
import { ConversionsTab } from "./ConversionsTab";
import { LossesTab } from "./LossesTab";
import { SegmentationTab } from "./SegmentationTab";

interface AnalyticsSectionProps {
  buKey: string;
  startDate: Date;
  endDate: Date;
}

export function AnalyticsSection({ buKey, startDate, endDate }: AnalyticsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between w-full p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PieChart className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-foreground">Análises Detalhadas</h3>
              <p className="text-sm text-muted-foreground">Pipeline, Conversões, Perdas e Segmentação</p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <Tabs defaultValue="pipeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pipeline" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="conversions" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Conversões</span>
              </TabsTrigger>
              <TabsTrigger value="losses" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Perdas</span>
              </TabsTrigger>
              <TabsTrigger value="segmentation" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Segmentação</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pipeline">
              <PipelineTab buKey={buKey} startDate={startDate} endDate={endDate} />
            </TabsContent>
            <TabsContent value="conversions">
              <ConversionsTab buKey={buKey} startDate={startDate} endDate={endDate} />
            </TabsContent>
            <TabsContent value="losses">
              <LossesTab buKey={buKey} startDate={startDate} endDate={endDate} />
            </TabsContent>
            <TabsContent value="segmentation">
              <SegmentationTab buKey={buKey} startDate={startDate} endDate={endDate} />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
