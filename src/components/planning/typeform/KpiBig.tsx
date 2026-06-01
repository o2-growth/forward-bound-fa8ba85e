import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiBigProps {
  label: string;
  value: string | number;
  loading?: boolean;
  hint?: string;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function KpiBig({ label, value, loading, hint, onClick, size = "md" }: KpiBigProps) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-colors",
        clickable && "cursor-pointer hover:bg-muted/40 hover:border-primary/40"
      )}
    >
      <CardContent className={cn("flex flex-col gap-2", size === "sm" ? "p-4" : "p-6")}>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {loading ? (
          <Skeleton className={cn(size === "sm" ? "h-7 w-20" : "h-9 w-24")} />
        ) : (
          <span
            className={cn(
              "font-bold text-foreground",
              size === "sm" ? "text-2xl" : "text-3xl"
            )}
          >
            {value}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
