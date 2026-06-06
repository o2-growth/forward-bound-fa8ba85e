import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeClientKey } from '@/lib/productClassifier';

/**
 * Busca todos os registros de pipefy_db_clientes uma única vez e devolve
 * um Map<chaveNormalizada, produtosRaw> indexado por Título, Empresa e
 * Razão Social — usado para enriquecer cards de venda com o campo "Produtos"
 * (que NÃO existe nas tabelas de movimentos).
 *
 * Tabela tem ~293 linhas, então cabe num único fetch.
 */
export function useClientesProdutos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clientes-produtos'],
    queryFn: async () => {
      const { data: resp, error: err } = await supabase.functions.invoke('query-external-db', {
        body: { table: 'pipefy_db_clientes', action: 'preview', limit: 5000 },
      });
      if (err) throw err;

      const rows: any[] = resp?.data || [];
      const map = new Map<string, string>();

      for (const row of rows) {
        const produtos = (row['Produtos'] || '').toString().trim();
        if (!produtos) continue;
        const keys = [
          normalizeClientKey(row['Título']),
          normalizeClientKey(row['Empresa']),
          normalizeClientKey(row['Razão Social']),
        ].filter(Boolean);
        for (const k of keys) {
          // Primeiro a entrar ganha — evita sobrescrever cliente bom com cliente vazio
          if (!map.has(k)) map.set(k, produtos);
        }
      }

      console.log(`[useClientesProdutos] indexed ${map.size} keys from ${rows.length} client rows`);
      return map;
    },
    staleTime: 60 * 60 * 1000, // 1h — produtos mudam pouco
    retry: 1,
  });

  return {
    produtosMap: data ?? new Map<string, string>(),
    isLoading,
    error,
  };
}
