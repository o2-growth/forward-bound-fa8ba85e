import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: DetailField[];
  extra?: React.ReactNode;
}

export function TypeformDetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  fields,
  extra,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {fields.map((f, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-1"
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              <span className="text-lg font-semibold text-foreground tabular-nums">
                {f.value}
              </span>
            </div>
          ))}
        </div>

        {extra && <div className="mt-6">{extra}</div>}
      </SheetContent>
    </Sheet>
  );
}
