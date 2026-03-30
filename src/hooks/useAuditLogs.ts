import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActionType = 'monetary_meta' | 'closer_meta' | 'plan_growth_meta' | 'update_cost_stage_metas';

interface AuditLogMetadata {
  bu?: string;
  month?: string;
  old_value?: number | string;
  new_value?: number | string;
  [key: string]: unknown;
}

export interface AuditLog {
  id: string;
  user_email: string;
  action_type: ActionType;
  description: string;
  metadata: AuditLogMetadata;
  created_at: string;
}

interface LogFilters {
  actionType?: ActionType | 'all';
  bu?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs() {
  const logAction = async (
    actionType: ActionType,
    description: string,
    metadata: AuditLogMetadata = {}
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_audit_logs' as any).insert({
      user_id: user.id,
      user_email: user.email ?? '',
      action_type: actionType,
      description,
      metadata,
    });
  };

  return { logAction };
}

export function useAuditLogsList(filters: LogFilters, page = 0, pageSize = 20) {
  return useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      let query = (supabase.from('admin_audit_logs' as any) as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.actionType && filters.actionType !== 'all') {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by BU in metadata client-side
      let logs = (data as AuditLog[]) || [];
      if (filters.bu && filters.bu !== 'all') {
        logs = logs.filter(l => (l.metadata as any)?.bu === filters.bu);
      }

      return logs;
    },
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: allLogs } = await (supabase.from('admin_audit_logs' as any) as any)
        .select('action_type, created_at')
        .gte('created_at', monthAgo)
        .order('created_at', { ascending: false });

      const logs = (allLogs || []) as { action_type: string; created_at: string }[];

      const thisWeek = logs.filter(l => l.created_at >= weekAgo).length;
      const thisMonth = logs.length;
      const monetary = logs.filter(l => l.action_type === 'monetary_meta').length;
      const closer = logs.filter(l => l.action_type === 'closer_meta').length;

      return { thisWeek, thisMonth, monetary, closer };
    },
  });
}
