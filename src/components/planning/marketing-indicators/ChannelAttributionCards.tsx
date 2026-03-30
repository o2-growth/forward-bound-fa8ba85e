import { Card, CardContent } from "@/components/ui/card";
import { ChannelSummary, CHANNEL_LABELS, ChannelId } from "./types";
import { TrendingUp, Users, ShoppingCart, DollarSign, Info, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<ChannelId, string> = {
  meta_ads: '📘',
  google_ads: '🔍',
  eventos: '🎪',
  organico: '🌱',
  outros: '📊',
};

interface ChannelAttributionCardsProps {
  summaries: ChannelSummary[];
  onChannelClick?: (channel: ChannelId) => void;
}

export function ChannelAttributionCards({ summaries, onChannelClick }: ChannelAttributionCardsProps) {
  if (!summaries.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Atribuição por Canal (Dados Reais)</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Dados do CRM — leads atribuídos ao canal com base na origem cadastrada. Clique para ver detalhes.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((s) => (
          <Card
            key={s.channel}
            className={cn(
              "relative group transition-all duration-200",
              onChannelClick && "cursor-pointer hover:border-primary/50 hover:shadow-md"
            )}
            onClick={() => onChannelClick?.(s.channel)}
          >
            {onChannelClick && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CHANNEL_ICONS[s.channel]}</span>
                <span className="font-semibold text-sm">{CHANNEL_LABELS[s.channel]}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Leads (CRM)</span>
                  <span className="font-semibold ml-auto">{s.leads}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Vendas</span>
                  <span className="font-semibold ml-auto">{s.vendas}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Receita</span>
                  <span className="font-semibold ml-auto">R$ {(s.receita / 1000).toFixed(0)}k</span>
                </div>
                {s.investimento > 0 && (
                  <div className="flex items-center gap-1.5 col-span-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">ROI</span>
                    <span className={`font-semibold ml-auto ${s.roi >= 1 ? 'text-chart-2' : 'text-destructive'}`}>
                      {s.roi.toFixed(1)}x
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
