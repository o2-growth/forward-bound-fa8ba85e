import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, BarChart3 } from "lucide-react";
import { CampaignFunnel, ChannelId, CHANNEL_LABELS } from "./types";

type MetricKey = "vendas" | "rms" | "rrs" | "mqls";

interface MetricOption {
  key: MetricKey;
  label: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: "vendas", label: "Vendas" },
  { key: "rms", label: "RM" },
  { key: "rrs", label: "RR" },
  { key: "mqls", label: "MQL" },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return null;
}

function getRankBg(rank: number): string {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
  return "";
}

function getChannelLabel(channel: ChannelId): string {
  return CHANNEL_LABELS[channel] || channel;
}

interface BestAdsSectionProps {
  campaignFunnels: CampaignFunnel[];
  adSetFunnels: Map<string, CampaignFunnel>;
}

export function BestAdsSection({ campaignFunnels, adSetFunnels }: BestAdsSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("vendas");

  // Combine campaign funnels and adSet funnels into a single ranked list
  const rankedItems = useMemo(() => {
    const items: Array<CampaignFunnel & { type: "campaign" | "adset" }> = [];

    // Add campaign funnels
    for (const f of campaignFunnels) {
      if (f.campaignName === "(Sem campanha)") continue;
      items.push({ ...f, type: "campaign" });
    }

    // Add adSet funnels
    for (const [, f] of adSetFunnels) {
      if (f.campaignName === "(Sem conjunto)") continue;
      items.push({ ...f, type: "adset" });
    }

    // Sort by selected metric descending
    items.sort((a, b) => b[selectedMetric] - a[selectedMetric]);

    // Only keep items that have at least 1 of the selected metric
    return items.filter((item) => item[selectedMetric] > 0).slice(0, 10);
  }, [campaignFunnels, adSetFunnels, selectedMetric]);

  // Compute conversion rate: metric / leads (or metric / previous stage)
  const getConversionRate = (item: CampaignFunnel): string => {
    if (item.leads === 0) return "—";
    const rate = (item[selectedMetric] / item.leads) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Melhores Anúncios / Campanhas
          </CardTitle>
          <div className="flex gap-1">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedMetric(opt.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedMetric === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rankedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível para o período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2 w-10">#</th>
                  <th className="text-left p-2">Campanha / Anúncio</th>
                  <th className="text-left p-2 w-24">Canal</th>
                  <th className="text-right p-2 w-20">
                    {METRIC_OPTIONS.find((o) => o.key === selectedMetric)?.label}
                  </th>
                  <th className="text-right p-2 w-24">Conversão %</th>
                  <th className="text-right p-2 w-28">Receita</th>
                </tr>
              </thead>
              <tbody>
                {rankedItems.map((item, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={`${item.campaignName}-${item.channel}-${index}`}
                      className={`border-b last:border-0 transition-colors hover:bg-muted/50 ${getRankBg(rank)}`}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          {getRankIcon(rank)}
                          <span className={`font-medium ${rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                            {rank}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[300px]" title={item.campaignName}>
                            {item.campaignName}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.type === "campaign" ? "Campanha" : "Conjunto"}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {getChannelLabel(item.channel)}
                        </Badge>
                      </td>
                      <td className="text-right p-2 font-semibold tabular-nums">
                        {item[selectedMetric]}
                      </td>
                      <td className="text-right p-2 text-muted-foreground tabular-nums">
                        {getConversionRate(item)}
                      </td>
                      <td className="text-right p-2 tabular-nums">
                        {formatCurrency(item.receita)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
