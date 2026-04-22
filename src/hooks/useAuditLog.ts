import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
  user_email: string | null;
}

export interface AuditLogFilters {
  tableName?: string;
  startDate?: string;
  endDate?: string;
  userEmail?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
}

interface UseAuditLogOptions {
  filters?: AuditLogFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useAuditLog({
  filters = {},
  page = 0,
  pageSize = 50,
  enabled = true,
}: UseAuditLogOptions = {}) {
  return useQuery({
    queryKey: ['audit-log', filters, page, pageSize],
    enabled,
    queryFn: async (): Promise<{ data: AuditLogEntry[]; count: number }> => {
      let query = (supabase.from('audit_log' as any) as any)
        .select('*', { count: 'exact' })
        .order('changed_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.tableName) {
        query = query.eq('table_name', filters.tableName);
      }

      if (filters.startDate) {
        query = query.gte('changed_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('changed_at', filters.endDate + 'T23:59:59.999Z');
      }

      if (filters.userEmail) {
        query = query.ilike('user_email', `%${filters.userEmail}%`);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.recordId) {
        query = query.eq('record_id', filters.recordId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      return {
        data: (data as AuditLogEntry[]) || [],
        count: count ?? 0,
      };
    },
  });
}

/**
 * Returns the list of tables that have audit logging enabled.
 */
export function getAuditedTables(): string[] {
  return [
    'monetary_metas',
    'funnel_metas',
    'closer_metas',
    'cost_stage_metas',
    'bu_indicators_config',
    'sales_realized',
    'user_roles',
    'user_tab_permissions',
    'meta_redistribution_sessions',
    'meta_redistribution_changes',
    'daily_revenue',
    'meta_ads_cache',
    'funnel_realized',
  ];
}

/**
 * Formats an audit log entry for display purposes.
 */
export function formatAuditLogEntry(entry: AuditLogEntry): {
  description: string;
  changedFields: string[];
} {
  const changedFields: string[] = [];

  if (entry.action === 'UPDATE' && entry.old_values && entry.new_values) {
    for (const key of Object.keys(entry.new_values)) {
      if (
        JSON.stringify(entry.old_values[key]) !==
        JSON.stringify(entry.new_values[key])
      ) {
        changedFields.push(key);
      }
    }
  }

  const user = entry.user_email || 'Sistema';
  const table = entry.table_name.replace(/_/g, ' ');

  let description: string;
  switch (entry.action) {
    case 'INSERT':
      description = `${user} criou um registro em ${table}`;
      break;
    case 'UPDATE':
      description = `${user} atualizou ${changedFields.length} campo(s) em ${table}`;
      break;
    case 'DELETE':
      description = `${user} removeu um registro de ${table}`;
      break;
    default:
      description = `${user} modificou ${table}`;
  }

  return { description, changedFields };
}
