import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PipefyCardLink, PIPEFY_PIPES } from "@/components/planning/nps/PipefyCardLink";

export type DrawerColumn = 'cliente' | 'cfo' | 'mrr' | 'setup' | 'lt' | 'motivo' | 'data' | 'fase';

export interface DrawerRow {
  id?: string;
  pipeId?: string;
  cliente: string;
  cfo?: string;
  mrr?: number;
  setup?: number;
  ltMeses?: string | number;
  motivo?: string;
  dataEncerramento?: string;
  faseAtual?: string;
}

export interface DrawerGroup {
  title: string;
  rows: DrawerRow[];
  emptyHint?: string;
}

export interface KpiDrawerData {
  title: string;
  subtitle?: string;
  formula?: string;
  columns: DrawerColumn[];
  groups: DrawerGroup[];
}

function fmtCurrency(v?: number) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(s?: string) {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

const COL_LABELS: Record<DrawerColumn, string> = {
  cliente: 'Cliente',
  cfo: 'CFO',
  mrr: 'MRR',
  setup: 'Setup',
  lt: 'LT (m)',
  motivo: 'Motivo',
  data: 'Data',
  fase: 'Fase',
};

interface Props {
  data: KpiDrawerData | null;
  onClose: () => void;
}

export function ChurnKpiDrawer({ data, onClose }: Props) {
  const open = !!data;
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-base">{data?.title}</SheetTitle>
          {data?.subtitle && (
            <SheetDescription className="text-sm font-medium text-foreground">
              {data.subtitle}
            </SheetDescription>
          )}
          {data?.formula && (
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              {data.formula}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          <div className="space-y-6 pb-6">
            {data?.groups.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h4>
                  <Badge variant="secondary" className="text-[10px]">{group.rows.length}</Badge>
                </div>
                {group.rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    {group.emptyHint || 'Nenhum registro.'}
                  </p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          {data.columns.map(c => (
                            <TableHead key={c} className="text-[10px] uppercase tracking-wider h-8">
                              {COL_LABELS[c]}
                            </TableHead>
                          ))}
                          <TableHead className="w-8 h-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row, ri) => (
                          <TableRow key={ri} className="text-xs">
                            {data.columns.map(c => (
                              <TableCell key={c} className="py-1.5">
                                {c === 'cliente' && <span className="font-medium text-foreground">{row.cliente}</span>}
                                {c === 'cfo' && (row.cfo || '—')}
                                {c === 'mrr' && fmtCurrency(row.mrr)}
                                {c === 'setup' && fmtCurrency(row.setup)}
                                {c === 'lt' && (row.ltMeses || '—')}
                                {c === 'motivo' && (row.motivo || '—')}
                                {c === 'data' && fmtDate(row.dataEncerramento)}
                                {c === 'fase' && (row.faseAtual || '—')}
                              </TableCell>
                            ))}
                            <TableCell className="py-1.5">
                              {row.id && !row.id.startsWith('synthetic-') && (
                                <PipefyCardLink
                                  pipeId={row.pipeId || PIPEFY_PIPES.CENTRAL_PROJETOS}
                                  cardId={row.id}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
