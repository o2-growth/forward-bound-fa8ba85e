import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NpsMetrics, NpsDistributionData, CsatDistributionData, SeanEllisItem } from '@/hooks/useNpsData';
import { CheckCircle2, XCircle, Target } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number | string;
  suffix?: string;
  description: string;
  meta: number | string;
  metaAtingida: boolean;
}

function ScoreCard({ title, score, suffix, description, meta, metaAtingida }: ScoreCardProps) {
  const scoreColor = metaAtingida ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
        <p className={`text-5xl font-bold ${scoreColor} leading-none`}>
          {score}<span className="text-2xl">{suffix}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Meta: {meta}{suffix}
          </span>
          {metaAtingida ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Atingida
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0 gap-1">
              <XCircle className="h-3 w-3" /> Não atingida
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  metrics: NpsMetrics;
  npsDistribution: NpsDistributionData;
  csatDistribution: CsatDistributionData;
  seanEllisDistribution: SeanEllisItem[];
}

export function NpsScoreCards({ metrics, npsDistribution, csatDistribution, seanEllisDistribution }: Props) {
  const seTotal = seanEllisDistribution.reduce((s, i) => s + i.count, 0);
  const seMuito = seanEllisDistribution.find(i => i.label.includes('Muito'))?.count || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ScoreCard
        title="NPS"
        score={metrics.nps.score}
        description={`${npsDistribution.promotores.count} promotores, ${npsDistribution.neutros.count} neutros, ${npsDistribution.detratores.count} detratores`}
        meta={metrics.nps.meta}
        metaAtingida={metrics.nps.metaAtingida}
      />
      <ScoreCard
        title="CSAT"
        score={metrics.csat.score}
        suffix="%"
        description={`${csatDistribution.satisfeitos.count} de ${csatDistribution.satisfeitos.count + csatDistribution.neutros.count + csatDistribution.insatisfeitos.count} respondentes satisfeitos`}
        meta={metrics.csat.meta}
        metaAtingida={metrics.csat.metaAtingida}
      />
      <ScoreCard
        title="SEAN ELLIS SCORE"
        score={metrics.seanEllis.score}
        suffix="%"
        description={`${seMuito} de ${seTotal} muito desapontados`}
        meta={metrics.seanEllis.meta}
        metaAtingida={metrics.seanEllis.metaAtingida}
      />
    </div>
  );
}
