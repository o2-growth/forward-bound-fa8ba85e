import { Info, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface DataSourceItem {
  system: string;
  resource: string;
  url?: string;
}

export interface DataSourceSpec {
  sources: DataSourceItem[];
  rules?: string[];
  notes?: string;
}

interface Props {
  source: DataSourceSpec;
  className?: string;
}

/**
 * Ícone (i) com tooltip detalhando a origem dos dados de um indicador/KPI:
 * Sistema → Recurso (pipe/tabela/endpoint) → Regra de cálculo → Link direto.
 *
 * Não afeta a lógica do indicador — é apenas camada de transparência.
 */
export function DataSourceInfo({ source, className }: Props) {
  const { sources, rules, notes } = source;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-help align-middle ${className ?? ''}`}
            aria-label="Origem dos dados"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm space-y-2 p-3 text-xs leading-relaxed"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Fonte{sources.length > 1 ? 's' : ''}
            </div>
            <ul className="space-y-1">
              {sources.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-foreground font-medium">{s.system}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{s.resource}</span>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-primary hover:underline ml-auto"
                    >
                      abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {rules && rules.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Regra de cálculo
              </div>
              <ul className="space-y-0.5 list-disc list-inside marker:text-muted-foreground/50">
                {rules.map((r, i) => (
                  <li key={i} className="text-foreground/90">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {notes && (
            <div className="pt-1 border-t border-border/50 text-[11px] text-muted-foreground italic">
              {notes}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DataSourceInfo;
