import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BUS, MONTHS, BuType, MonthType, isPontualOnlyBU } from './useMonetaryMetas';

export const ANNUAL_TARGET = 33360736;

export interface RedistributionChange {
  fromBU: BuType;
  fromMonth: MonthType;
  toBU: BuType;
  toMonth: MonthType;
  amount: number;
}

export interface RedistributionSession {
  id: string;
  description: string;
  user_id: string;
  user_email: string;
  created_at: string;
  is_active: boolean;
  changes_count: number;
}

export interface RedistributionChangeRow {
  id: string;
  session_id: string;
  from_bu: string;
  from_month: string;
  to_bu: string;
  to_month: string;
  amount: number;
  value_before_from: number;
  value_before_to: number;
  value_after_from: number;
  value_after_to: number;
  created_at: string;
}

type MetaGrid = Record<string, Record<string, number>>;

function getMetaField(bu: BuType): 'faturamento' | 'pontual' {
  return isPontualOnlyBU(bu) ? 'pontual' : 'faturamento';
}

export function useMetaRedistribution(year = 2026) {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<RedistributionChange[]>([]);

  // Fetch all monetary_metas for the year
  const { data: metas = [], isLoading: isLoadingMetas } = useQuery({
    queryKey: ['monetary-metas', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetary_metas')
        .select('*')
        .eq('year', year)
        .order('bu')
        .order('month');

      if (error) throw error;
      return data || [];
    },
  });

  // Build a grid of current values: { bu: { month: value } }
  const currentGrid = useMemo<MetaGrid>(() => {
    const grid: MetaGrid = {};
    for (const bu of BUS) {
      grid[bu] = {};
      for (const month of MONTHS) {
        grid[bu][month] = 0;
      }
    }
    for (const m of metas) {
      const field = getMetaField(m.bu as BuType);
      if (grid[m.bu]) {
        grid[m.bu][m.month] = Number(m[field]) || 0;
      }
    }
    return grid;
  }, [metas]);

  // Calculate current annual total per BU and overall
  const currentTotals = useMemo(() => {
    const perBU: Record<string, number> = {};
    let overall = 0;
    for (const bu of BUS) {
      let buTotal = 0;
      for (const month of MONTHS) {
        buTotal += currentGrid[bu]?.[month] || 0;
      }
      perBU[bu] = buTotal;
      overall += buTotal;
    }
    return { perBU, overall };
  }, [currentGrid]);

  // Add a pending change
  const addChange = useCallback(
    (fromBU: BuType, fromMonth: MonthType, toBU: BuType, toMonth: MonthType, amount: number) => {
      setPendingChanges((prev) => [...prev, { fromBU, fromMonth, toBU, toMonth, amount }]);
    },
    []
  );

  // Remove a pending change by index
  const removeChange = useCallback((index: number) => {
    setPendingChanges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all pending changes
  const clearChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  // Calculate what the grid would look like after pending changes
  const calculateNewTotals = useCallback((): MetaGrid => {
    const grid: MetaGrid = {};
    for (const bu of BUS) {
      grid[bu] = {};
      for (const month of MONTHS) {
        grid[bu][month] = currentGrid[bu]?.[month] || 0;
      }
    }
    for (const change of pendingChanges) {
      grid[change.fromBU][change.fromMonth] -= change.amount;
      grid[change.toBU][change.toMonth] += change.amount;
    }
    return grid;
  }, [currentGrid, pendingChanges]);

  // Validate that total equals ANNUAL_TARGET
  const validateTotal = useCallback((): { valid: boolean; diff: number; newTotal: number } => {
    const newGrid = calculateNewTotals();
    let total = 0;
    for (const bu of BUS) {
      for (const month of MONTHS) {
        total += newGrid[bu]?.[month] || 0;
      }
    }
    return {
      valid: Math.abs(total - ANNUAL_TARGET) < 1,
      diff: total - ANNUAL_TARGET,
      newTotal: total,
    };
  }, [calculateNewTotals]);

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (description: string) => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const newGrid = calculateNewTotals();
      const validation = validateTotal();
      if (!validation.valid) {
        throw new Error(`Meta total diverge: diferença de R$ ${validation.diff.toFixed(2)}`);
      }

      // Build changes for the edge function
      const dbChanges: any[] = [];
      const affected = new Map<string, { bu: BuType; month: MonthType }>();
      for (const c of pendingChanges) {
        affected.set(`${c.fromBU}-${c.fromMonth}`, { bu: c.fromBU, month: c.fromMonth });
        affected.set(`${c.toBU}-${c.toMonth}`, { bu: c.toBU, month: c.toMonth });
      }
      for (const { bu, month } of affected.values()) {
        const field = getMetaField(bu);
        const valueBefore = currentGrid[bu]?.[month] || 0;
        const valueAfter = newGrid[bu]?.[month] || 0;
        if (valueBefore !== valueAfter) {
          dbChanges.push({
            bu, month, year, field,
            value_before: valueBefore,
            value_after: valueAfter,
            delta: valueAfter - valueBefore,
          });
        }
      }

      const { data: result, error: saveErr } = await supabase.functions.invoke('manage-redistribution', {
        body: {
          action: 'save_session',
          description,
          total_before: currentTotals.overall,
          total_after: validation.newTotal,
          changes: dbChanges,
        },
      });

      if (saveErr) throw new Error(saveErr.message || 'Erro ao salvar');
      if (result?.error) throw new Error(result.error);
      return result.session_id;
    },
    onSuccess: () => {
      setPendingChanges([]);
      queryClient.invalidateQueries({ queryKey: ['monetary-metas', year] });
      queryClient.invalidateQueries({ queryKey: ['meta-redistribution-sessions', year] });
    },
  });

  // Fetch sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['meta-redistribution-sessions', year],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-redistribution', {
        body: { action: 'list_sessions' },
      });
      if (error) throw error;
      return (data?.sessions || []) as RedistributionSession[];
    },
  });

  // Fetch changes for a specific session
  const getSessionChanges = useCallback(async (sessionId: string): Promise<RedistributionChangeRow[]> => {
    const { data, error } = await supabase.functions.invoke('manage-redistribution', {
      body: { action: 'get_session_changes', session_id: sessionId },
    });
    if (error) throw error;
    return (data?.changes || []) as RedistributionChangeRow[];
  }, []);

  // Rollback a session
  const rollbackSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-redistribution', {
        body: { action: 'rollback_session', session_id: sessionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetary-metas', year] });
      queryClient.invalidateQueries({ queryKey: ['meta-redistribution-sessions', year] });
    },
  });

  return {
    metas,
    isLoadingMetas,
    currentGrid,
    currentTotals,
    pendingChanges,
    addChange,
    removeChange,
    clearChanges,
    calculateNewTotals,
    validateTotal,
    saveSession: saveSessionMutation.mutateAsync,
    isSaving: saveSessionMutation.isPending,
    sessions,
    isLoadingSessions,
    refetchSessions,
    getSessionChanges,
    rollbackSession: rollbackSessionMutation.mutateAsync,
    isRollingBack: rollbackSessionMutation.isPending,
  };
}
