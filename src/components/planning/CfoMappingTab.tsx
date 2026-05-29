import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useJornadaData } from '@/hooks/useJornadaData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Link2, Unlink, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
}

interface MappingRow {
  user_id: string;
  cfo_name: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

export function CfoMappingTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { allCfos, isLoading: jornadaLoading } = useJornadaData();

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name');
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['cfo-user-mappings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('cfo_user_mapping').select('user_id, cfo_name');
      if (error) throw error;
      return ((data || []) as unknown) as MappingRow[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-user-roles-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return (data || []) as RoleRow[];
    },
  });

  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCfo, setSelectedCfo] = useState<string>('');

  const usedUserIds = useMemo(() => new Set((mappings || []).map(m => m.user_id)), [mappings]);
  const usedCfoNames = useMemo(() => new Set((mappings || []).map(m => m.cfo_name)), [mappings]);

  const availableProfiles = useMemo(
    () => (profiles || []).filter(p => !usedUserIds.has(p.id)),
    [profiles, usedUserIds],
  );

  const availableCfoNames = useMemo(
    () => allCfos.filter(c => !usedCfoNames.has(c)).sort((a, b) => a.localeCompare(b)),
    [allCfos, usedCfoNames],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cfo-user-mappings'] });
    qc.invalidateQueries({ queryKey: ['admin-user-roles-all'] });
    qc.invalidateQueries({ queryKey: ['user-role'] });
    qc.invalidateQueries({ queryKey: ['my-cfo-name'] });
  };

  const createMapping = useMutation({
    mutationFn: async ({ userId, cfoName }: { userId: string; cfoName: string }) => {
      // 1) Garante role 'cfo' (remove user/admin)
      await supabase.from('user_roles').delete().eq('user_id', userId).in('role', ['user', 'admin']);
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'cfo' as any });
      if (roleErr) throw roleErr;
      // 2) Cria o mapping
      const { error: mapErr } = await supabase
        .from('cfo_user_mapping' as any)
        .insert({ user_id: userId, cfo_name: cfoName });
      if (mapErr) throw mapErr;
    },
    onSuccess: () => {
      toast({ title: 'Acesso CFO vinculado' });
      setSelectedUser('');
      setSelectedCfo('');
      invalidate();
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro ao vincular', description: e.message });
    },
  });

  const removeMapping = useMutation({
    mutationFn: async (userId: string) => {
      // 1) Remove mapping
      const { error: mapErr } = await supabase.from('cfo_user_mapping' as any).delete().eq('user_id', userId);
      if (mapErr) throw mapErr;
      // 2) Volta para role 'user'
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'cfo');
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'user' as any });
      if (roleErr) throw roleErr;
    },
    onSuccess: () => {
      toast({ title: 'Vínculo removido' });
      invalidate();
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: e.message });
    },
  });

  const isLoading = profilesLoading || mappingsLoading || jornadaLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">Acessos CFO</h2>
        <p className="text-muted-foreground text-sm">
          Vincule usuários ao nome do CFO no Pipefy. Ao vincular, o usuário passa a ver somente
          a aba Operação com seus próprios clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Novo vínculo
          </CardTitle>
          <CardDescription>Escolha o usuário e o nome do CFO correspondente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Usuário (email)" />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nenhum usuário disponível
                  </div>
                ) : (
                  availableProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.email} {p.full_name ? `— ${p.full_name}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={selectedCfo} onValueChange={setSelectedCfo}>
              <SelectTrigger>
                <SelectValue placeholder="Nome do CFO (Pipefy)" />
              </SelectTrigger>
              <SelectContent>
                {availableCfoNames.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Todos os CFOs já estão vinculados
                  </div>
                ) : (
                  availableCfoNames.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!selectedUser || !selectedCfo || createMapping.isPending}
            onClick={() => createMapping.mutate({ userId: selectedUser, cfoName: selectedCfo })}
          >
            {createMapping.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            Vincular
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Vínculos ativos
          </CardTitle>
          <CardDescription>{(mappings || []).length} usuário(s) com acesso CFO.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(mappings || []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum vínculo cadastrado.</p>
          )}
          {(mappings || []).map(m => {
            const profile = profileMap.get(m.user_id);
            const isCfoRole = (roles || []).some(r => r.user_id === m.user_id && r.role === 'cfo');
            return (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-card/50"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {profile?.email || m.user_id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.full_name || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{m.cfo_name}</Badge>
                  {!isCfoRole && <Badge variant="destructive" className="text-[10px]">role ≠ cfo</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeMapping.mutate(m.user_id)}
                    disabled={removeMapping.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-1" /> Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
