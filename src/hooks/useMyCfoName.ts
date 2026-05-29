import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the CFO name mapped to the currently authenticated user (via RPC).
 * Null if the user has no mapping or is not a CFO.
 */
export function useMyCfoName(enabled: boolean) {
  return useQuery({
    queryKey: ['my-cfo-name'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_cfo_name');
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
