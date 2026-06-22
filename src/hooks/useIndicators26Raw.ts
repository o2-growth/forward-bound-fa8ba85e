import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  INDICATORS26_SNAPSHOT,
  INDICATORS26_LAST_UPDATE,
  type Indicator26Row,
} from '@/data/indicators26Snapshot';

export type { Indicator26Row };

interface RawResponse {
  success?: boolean;
  rows?: Indicator26Row[];
  lastUpdate?: string | null;
  error?: string;
}

export interface UseIndicators26RawResult {
  rows: Indicator26Row[];
  lastUpdate: string | null;
  /** true quando os dados vieram do snapshot local (fonte ao vivo indisponível) */
  isFallback: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Lê a grade completa da aba "Indicadores 26" via edge function `read-marketing-sheet`
 * (modo `raw`). Se a função ainda não suportar esse modo (ex.: ambiente local sem deploy),
 * cai no snapshot estático gerado da planilha — assim a tela sempre renderiza.
 */
export function useIndicators26Raw(): UseIndicators26RawResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['indicators26-raw'],
    queryFn: async (): Promise<{ rows: Indicator26Row[]; lastUpdate: string | null; isFallback: boolean }> => {
      try {
        const { data, error } = await supabase.functions.invoke<RawResponse>('read-marketing-sheet', {
          body: { mode: 'raw' },
        });
        if (error) throw error;
        if (data?.success && Array.isArray(data.rows) && data.rows.length > 0) {
          return { rows: data.rows, lastUpdate: data.lastUpdate ?? null, isFallback: false };
        }
        throw new Error(data?.error || 'Resposta vazia do modo raw');
      } catch (e) {
        // Fallback: snapshot estático da planilha
        return {
          rows: INDICATORS26_SNAPSHOT,
          lastUpdate: INDICATORS26_LAST_UPDATE,
          isFallback: true,
        };
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  return {
    rows: data?.rows ?? INDICATORS26_SNAPSHOT,
    lastUpdate: data?.lastUpdate ?? INDICATORS26_LAST_UPDATE,
    isFallback: data?.isFallback ?? true,
    isLoading,
    error: (error as Error) ?? null,
    refetch,
  };
}
