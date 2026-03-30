import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingChannel } from "./types";
import { Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChannelMetricsCardsProps {
  channels: MarketingChannel[];
  totalInvestment: number;
  totalLeads: number;
}

const CHANNEL_STYLES: Record<string, { color: string; emoji: string }> = {
  meta_ads: { color: 'border-l-blue-500', emoji: '📘' },
  google_ads: { color: 'border-l-green-500', emoji: '🔍' },
  eventos: { color: 'border-l-amber-500', emoji: '🎪' },
  organico: { color: 'border-l-emerald-500', emoji: '🌱' },
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function ChannelMetricsCards({ channels, totalInvestment, totalLeads }: ChannelMetricsCardsProps) {
  const totalCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">Mídia e Leads por Canal</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Dados da API do Meta/Google Ads — leads registrados pela plataforma de anúncios</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((ch) => {
          const style = CHANNEL_STYLES[ch.id] || { color: 'border-l-muted-foreground', emoji: '📊' };
          return (
            <Card key={ch.id} className={`border-l-4 ${style.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span>{style.emoji}</span>
                  {ch.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Mídia</span>
                  <span className="font-semibold text-foreground">{formatCurrency(ch.investment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Leads (Plataforma)</span>
                  <span className="font-semibold text-foreground">{formatNumber(ch.leads)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">CPL</span>
                  <span className="font-semibold text-foreground">{formatCurrency(ch.cpl)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Totals Card */}
        <Card className="border-l-4 border-l-primary bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              TOTAIS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Mídia Total</span>
              <span className="font-bold text-primary">{formatCurrency(totalInvestment)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Leads Totais (Plataforma)</span>
              <span className="font-bold text-primary">{formatNumber(totalLeads)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">CPL Total</span>
              <span className="font-bold text-primary">{formatCurrency(totalCpl)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
