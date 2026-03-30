import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClickableRadialCardProps {
  title: string;
  realized: number;
  meta: number;
  onClick?: () => void;
  isClickable?: boolean;
}

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));

export function ClickableRadialCard({ 
  title, 
  realized, 
  meta, 
  onClick,
  isClickable = false 
}: ClickableRadialCardProps) {
  const percentage = meta > 0 ? (realized / meta) * 100 : 0;
  const isAboveMeta = percentage >= 100;
  const chartData = [{ value: Math.min(percentage, 100), fill: isAboveMeta ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" }];

  return (
    <Card 
      className={cn(
        "bg-card border-border relative group transition-all duration-200",
        isClickable && "cursor-pointer hover:border-primary/50 hover:shadow-md"
      )}
      onClick={onClick}
    >
      {isClickable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-0">
        <div className="relative w-32 h-32">
          <RadialBarChart width={128} height={128} innerRadius="70%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
          </RadialBarChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{formatNumber(realized)}</span>
            <span className={`text-sm font-medium ${isAboveMeta ? "text-chart-2" : "text-destructive"}`}>{Math.round(percentage)}%</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Meta: {formatNumber(meta)}</p>
      </CardContent>
    </Card>
  );
}
