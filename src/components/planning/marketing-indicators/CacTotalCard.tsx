import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";

interface Props {
  investment: number;
  sales: number;
}

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function CacTotalCard({ investment, sales }: Props) {
  const cac = sales > 0 ? investment / sales : 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/15 p-3">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">
            CAC Total (período filtrado)
          </p>
          <p className="text-4xl font-bold tracking-tight mt-1">
            {formatBRL(cac)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Investimento: <span className="font-medium text-foreground">{formatBRL(investment)}</span>
            {'  ÷  '}
            Vendas: <span className="font-medium text-foreground">{sales}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
