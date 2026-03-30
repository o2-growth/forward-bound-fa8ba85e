import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ChevronDown } from "lucide-react";
import { MONTHS, type BuType, type MonthType } from "@/hooks/useMonetaryMetas";

const BUS: BuType[] = ['modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia'];

function formatCurrency(value: number): string {
  if (value === 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

interface DreTableProps {
  dreByBU: Record<BuType, Record<MonthType, number>>;
  isLoading: boolean;
}

export function DreTable({ dreByBU, isLoading }: DreTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>DRE Mensal por BU</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  // Expansão = oxy_hacker + franquia
  const expansaoByMonth: Record<MonthType, number> = {} as any;
  MONTHS.forEach(m => {
    expansaoByMonth[m] = (dreByBU.oxy_hacker?.[m] || 0) + (dreByBU.franquia?.[m] || 0);
  });
  const expansaoTotal = MONTHS.reduce((sum, m) => sum + expansaoByMonth[m], 0);

  const totals: Record<MonthType, number> = {} as any;
  MONTHS.forEach(m => {
    totals[m] = BUS.reduce((sum, bu) => sum + (dreByBU[bu]?.[m] || 0), 0);
  });
  const grandTotal = MONTHS.reduce((sum, m) => sum + totals[m], 0);

  const mainRows: { key: string; label: string; getData: (m: MonthType) => number }[] = [
    {
      key: 'modelo_atual',
      label: 'CaaS',
      getData: (m) => dreByBU.modelo_atual?.[m] || 0,
    },
    {
      key: 'o2_tax',
      label: 'Tax',
      getData: (m) => dreByBU.o2_tax?.[m] || 0,
    },
  ];

  const subRows: { key: string; label: string; getData: (m: MonthType) => number }[] = [
    {
      key: 'oxy_hacker',
      label: 'Oxy Hacker',
      getData: (m) => dreByBU.oxy_hacker?.[m] || 0,
    },
    {
      key: 'franquia',
      label: 'Franquia',
      getData: (m) => dreByBU.franquia?.[m] || 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">DRE — Faturamento Contábil Mensal</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">BU</TableHead>
              {MONTHS.map(m => (
                <TableHead key={m} className="text-right min-w-[90px]">{m}</TableHead>
              ))}
              <TableHead className="text-right min-w-[110px] font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Main rows: CaaS, Tax */}
            {mainRows.map(row => {
              const rowTotal = MONTHS.reduce((sum, m) => sum + row.getData(m), 0);
              return (
                <TableRow key={row.key}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">{row.label}</TableCell>
                  {MONTHS.map(m => (
                    <TableCell key={m} className="text-right tabular-nums text-sm">
                      {formatCurrency(row.getData(m))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(rowTotal)}</TableCell>
                </TableRow>
              );
            })}

            {/* Expansão row (collapsible) */}
            <TableRow
              className="cursor-pointer hover:bg-muted/60"
              onClick={() => setExpanded(!expanded)}
            >
              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                  Expansão
                </span>
              </TableCell>
              {MONTHS.map(m => (
                <TableCell key={m} className="text-right tabular-nums text-sm">
                  {formatCurrency(expansaoByMonth[m])}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(expansaoTotal)}</TableCell>
            </TableRow>

            {/* Sub-rows: Oxy Hacker, Franquia */}
            {expanded && subRows.map(row => {
              const rowTotal = MONTHS.reduce((sum, m) => sum + row.getData(m), 0);
              return (
                <TableRow key={row.key} className="bg-muted/30">
                  <TableCell className="sticky left-0 bg-muted/30 z-10 pl-9 text-muted-foreground text-sm">
                    {row.label}
                  </TableCell>
                  {MONTHS.map(m => (
                    <TableCell key={m} className="text-right tabular-nums text-xs text-muted-foreground">
                      {formatCurrency(row.getData(m))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatCurrency(rowTotal)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="sticky left-0 bg-muted/50 z-10 font-bold">Total</TableCell>
              {MONTHS.map(m => (
                <TableCell key={m} className="text-right tabular-nums font-bold">
                  {formatCurrency(totals[m])}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums font-bold text-primary">
                {formatCurrency(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
