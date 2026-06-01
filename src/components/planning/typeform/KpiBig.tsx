import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiBigProps {
  label: string;
  value: string | number;
  loading?: boolean;
  hint?: string;
}

export function KpiBig({ label, value, loading, hint }: KpiBigProps) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <span className="text-3xl font-bold text-foreground">{value}</span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
