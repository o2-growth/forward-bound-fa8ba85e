import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { ArrowUpDown } from "lucide-react";
import { CampaignFunnel, CHANNEL_LABELS, ChannelId } from "./types";
import { cn } from "@/lib/utils";

interface CampaignFunnelTableProps {
  funnels: CampaignFunnel[];
}

type SortKey = keyof CampaignFunnel;

const CHANNEL_FILTER_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

export function CampaignFunnelTable({ funnels }: CampaignFunnelTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('leads');
  const [sortAsc, setSortAsc] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let data = funnels;
    if (channelFilter.length > 0) {
      data = data.filter(f => channelFilter.includes(f.channel));
    }
    return [...data].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      if (typeof av === 'string') return sortAsc ? (av as string).localeCompare(bv as unknown as string) : (bv as unknown as string).localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
  }, [funnels, sortKey, sortAsc, channelFilter]);

  const totals = useMemo(() => ({
    leads: filtered.reduce((s, f) => s + f.leads, 0),
    mqls: filtered.reduce((s, f) => s + f.mqls, 0),
    rms: filtered.reduce((s, f) => s + f.rms, 0),
    rrs: filtered.reduce((s, f) => s + f.rrs, 0),
    propostas: filtered.reduce((s, f) => s + f.propostas, 0),
    vendas: filtered.reduce((s, f) => s + f.vendas, 0),
    receita: filtered.reduce((s, f) => s + f.receita, 0),
    investimento: filtered.reduce((s, f) => s + f.investimento, 0),
  }), [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </span>
    </TableHead>
  );

  if (!funnels.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Funil por Campanha (Dados Reais)</CardTitle>
          <MultiSelect
            options={CHANNEL_FILTER_OPTIONS}
            selected={channelFilter}
            onSelectionChange={setChannelFilter}
            placeholder="Todos os Canais"
            className="min-w-[150px]"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Canal" field="channel" />
                <SortHeader label="Campanha" field="campaignName" />
                <SortHeader label="Leads" field="leads" />
                <SortHeader label="MQLs" field="mqls" />
                <SortHeader label="RM" field="rms" />
                <SortHeader label="RR" field="rrs" />
                <SortHeader label="Proposta" field="propostas" />
                <SortHeader label="Venda" field="vendas" />
                <SortHeader label="Receita" field="receita" />
                <SortHeader label="Invest." field="investimento" />
                <SortHeader label="ROI" field="roi" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f, i) => (
                <TableRow key={`${f.campaignName}-${i}`}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {CHANNEL_LABELS[f.channel]}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs font-medium" title={f.campaignName}>
                    {f.campaignName}
                  </TableCell>
                  <TableCell className="text-right text-xs">{f.leads}</TableCell>
                  <TableCell className="text-right text-xs">{f.mqls}</TableCell>
                  <TableCell className="text-right text-xs">{f.rms}</TableCell>
                  <TableCell className="text-right text-xs">{f.rrs}</TableCell>
                  <TableCell className="text-right text-xs">{f.propostas}</TableCell>
                  <TableCell className="text-right text-xs">{f.vendas}</TableCell>
                  <TableCell className="text-right text-xs whitespace-nowrap">
                    {f.receita > 0 ? `R$ ${(f.receita / 1000).toFixed(0)}k` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs whitespace-nowrap">
                    {f.investimento > 0 ? `R$ ${(f.investimento / 1000).toFixed(0)}k` : '-'}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right text-xs font-semibold",
                    f.roi >= 1 ? "text-chart-2" : f.roi > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {f.investimento > 0 ? `${f.roi.toFixed(1)}x` : 'N/D'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={2}>Total ({filtered.length} campanhas)</TableCell>
                <TableCell className="text-right">{totals.leads}</TableCell>
                <TableCell className="text-right">{totals.mqls}</TableCell>
                <TableCell className="text-right">{totals.rms}</TableCell>
                <TableCell className="text-right">{totals.rrs}</TableCell>
                <TableCell className="text-right">{totals.propostas}</TableCell>
                <TableCell className="text-right">{totals.vendas}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  R$ {(totals.receita / 1000).toFixed(0)}k
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  R$ {(totals.investimento / 1000).toFixed(0)}k
                </TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  totals.investimento > 0 && totals.receita / totals.investimento >= 1 ? "text-chart-2" : "text-destructive"
                )}>
                  {totals.investimento > 0 ? `${(totals.receita / totals.investimento).toFixed(1)}x` : 'N/D'}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
