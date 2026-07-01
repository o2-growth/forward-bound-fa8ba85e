import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TabKey = 'context' | 'goals' | 'monthly' | 'media' | 'marketing' | 'structure' | 'admin' | 'indicators' | 'marketing_indicators' | 'nps' | 'financial' | 'jornada' | 'cs' | 'g4';

export function useUserPermissions(userId: string | undefined) {
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_tab_permissions')
        .select('tab_key')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data.map(p => p.tab_key as TabKey);
    },
    enabled: !!userId,
  });

  const { data: roleInfo, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      if (!userId) return { isAdmin: false, isCfo: false };
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      const roles = (data || []).map(r => r.role as string);
      return {
        isAdmin: roles.includes('admin'),
        isCfo: roles.includes('cfo'),
      };
    },
    enabled: !!userId,
  });

  const isAdmin = roleInfo?.isAdmin ?? false;
  const isCfo = roleInfo?.isCfo ?? false;

  // Admins have access to all tabs
  const allAdminTabs: TabKey[] = ['context', 'goals', 'monthly', 'media', 'indicators', 'cs', 'financial', 'marketing', 'structure', 'admin', 'g4'];
  
  // CFOs only see the Operação (cs) tab — fully locked
  if (isCfo && !isAdmin) {
    return {
      allowedTabs: ['cs'] as TabKey[],
      isAdmin: false,
      isCfo: true,
      loading: permissionsLoading || roleLoading,
    };
  }

  // Map marketing_indicators and nps permissions to indicators tab access
  // Map jornada and nps permissions to cs (Customer Success) tab access
  const rawPermissions = permissions || [];
  let mappedPermissions = rawPermissions.includes('marketing_indicators') || rawPermissions.includes('nps')
    ? [...new Set([...rawPermissions, 'indicators' as TabKey])]
    : [...rawPermissions];
  // Grant cs tab access to users who have jornada or nps permissions
  if (rawPermissions.includes('jornada') || rawPermissions.includes('nps')) {
    mappedPermissions = [...new Set([...mappedPermissions, 'cs' as TabKey])];
  }

  const allowedTabs: TabKey[] = isAdmin
    ? allAdminTabs
    : mappedPermissions.filter(t => !['marketing_indicators', 'nps', 'jornada'].includes(t));

  return {
    allowedTabs,
    isAdmin,
    isCfo: false,
    loading: permissionsLoading || roleLoading,
  };
}
