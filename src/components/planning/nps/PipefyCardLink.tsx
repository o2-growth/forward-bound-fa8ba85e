import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Known pipe IDs
export const PIPEFY_PIPES = {
  CENTRAL_PROJETOS: '306756838',
  TRATATIVAS: '306731433',
  SETUP: '304026589',
  ROTINAS: '306755752',
  // NPS pipe ID is extracted dynamically from connections data
} as const;

interface Props {
  pipeId: string;
  cardId: string;
  label?: string;
  variant?: 'icon' | 'button';
}

export function PipefyCardLink({ pipeId, cardId, label = 'Abrir no Pipefy', variant = 'icon' }: Props) {
  const url = `https://app.pipefy.com/pipes/${pipeId}#cards/${cardId}`;

  if (variant === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
        title={label}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
        <ExternalLink className="h-3.5 w-3.5" />
        {label}
      </a>
    </Button>
  );
}
