import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

interface Props<T> {
  title: string;
  data?: T[];
  loading?: boolean;
  columns: Column<T>[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  maxRows?: number;
}

export function FunnelTable<T extends Record<string, any>>({
  title,
  data,
  loading,
  columns,
  emptyMessage = "Sem dados",
  onRowClick,
  maxRows,
}: Props<T>) {
  const rows = maxRows && data ? data.slice(0, maxRows) : data;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : !rows || rows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead
                      key={String(col.key)}
                      className={col.align === "right" ? "text-right" : ""}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    key={i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={String(col.key)}
                        className={col.align === "right" ? "text-right tabular-nums" : ""}
                      >
                        {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
