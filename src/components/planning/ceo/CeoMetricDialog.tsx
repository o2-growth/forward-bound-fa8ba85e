import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CeoBreakdownRow {
  label: string;
  value: string;
  extra?: string;
  tone?: "default" | "danger" | "success" | "muted";
}

export interface CeoTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: (row: T) => ReactNode;
}

export interface CeoMetricDialogPayload {
  title: string;
  value?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  breakdown?: {
    title?: string;
    rows: CeoBreakdownRow[];
    totalsLabel?: string;
    totalsValue?: string;
  };
  table?: {
    title?: string;
    columns: CeoTableColumn<any>[];
    rows: Record<string, unknown>[];
    emptyMessage?: string;
  };
  notes?: string[];
}

interface CeoMetricDialogProps {
  payload: CeoMetricDialogPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toneClass(tone?: CeoBreakdownRow["tone"]) {
  switch (tone) {
    case "danger":
      return "text-destructive";
    case "success":
      return "text-green-600 dark:text-green-400";
    case "muted":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

export function CeoMetricDialog({ payload, open, onOpenChange }: CeoMetricDialogProps) {
  if (!payload) return null;
  const { title, value, subtitle, description, badge, breakdown, table, notes } = payload;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
              {subtitle && <SheetDescription className="text-xs">{subtitle}</SheetDescription>}
            </div>
            {badge && (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {value && <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {breakdown && breakdown.rows.length > 0 && (
              <section>
                {breakdown.title && (
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {breakdown.title}
                  </h4>
                )}
                <div className="rounded-md border border-border divide-y divide-border">
                  {breakdown.rows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{row.label}</div>
                        {row.extra && (
                          <div className="text-xs text-muted-foreground truncate">{row.extra}</div>
                        )}
                      </div>
                      <div className={`text-sm font-semibold tabular-nums ${toneClass(row.tone)}`}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                  {breakdown.totalsLabel && (
                    <div className="flex items-center justify-between gap-4 px-3 py-2.5 bg-muted/30">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {breakdown.totalsLabel}
                      </div>
                      <div className="text-sm font-bold tabular-nums text-foreground">
                        {breakdown.totalsValue}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {table && (
              <section>
                {table.title && (
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {table.title}
                  </h4>
                )}
                {table.rows.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    {table.emptyMessage ?? "Sem dados no período."}
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="max-h-[420px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow>
                            {table.columns.map((c) => (
                              <TableHead
                                key={c.key}
                                className={`text-xs ${
                                  c.align === "right"
                                    ? "text-right"
                                    : c.align === "center"
                                      ? "text-center"
                                      : "text-left"
                                }`}
                              >
                                {c.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.rows.map((row, i) => (
                            <TableRow key={i}>
                              {table.columns.map((c) => {
                                const raw = (row as Record<string, unknown>)[c.key];
                                const content = c.format ? c.format(row) : (raw as ReactNode);
                                return (
                                  <TableCell
                                    key={c.key}
                                    className={`text-xs ${
                                      c.align === "right"
                                        ? "text-right tabular-nums"
                                        : c.align === "center"
                                          ? "text-center"
                                          : "text-left"
                                    }`}
                                  >
                                    {content as ReactNode}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {notes && notes.length > 0 && (
              <section className="rounded-md border border-dashed border-border bg-muted/20 p-3 space-y-1">
                {notes.map((n, i) => (
                  <p key={i} className="text-[11px] leading-relaxed text-muted-foreground">
                    {n}
                  </p>
                ))}
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
