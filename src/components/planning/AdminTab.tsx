import { useState } from 'react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { TabKey } from '@/hooks/useUserPermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Save, Shield, Trash2, User, Target, DollarSign, History, Gauge } from 'lucide-react';
import { CreateUserForm } from './CreateUserForm';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { CloserMetasTab } from './CloserMetasTab';
import { MonetaryMetasTab } from './MonetaryMetasTab';
import { CostStageMetasTab } from './CostStageMetasTab';
import { AdminLogsTab } from './AdminLogsTab';

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: 'context', label: 'Macro 2025' },
  { key: 'goals', label: 'Macro 2026' },
  { key: 'monthly', label: 'Meta por BU' },
  
  { key: 'media', label: 'Plan Growth' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'structure', label: 'Estrutura' },
];

export function AdminTab() {
  const { users, loading, updatePermissions, toggleAdmin, createUser, updateUser, deleteUser } = useAdminPermissions();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<TabKey[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Edit/Delete dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    full_name: string | null;
  } | null>(null);

  const handleCreateUser = async (data: {
    email: string;
    password: string;
    fullName?: string;
    permissions: TabKey[];
  }) => {
    await createUser.mutateAsync(data);
  };

  const startEditing = (userId: string, currentPermissions: TabKey[]) => {
    setEditingUser(userId);
    setTempPermissions([...currentPermissions]);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setTempPermissions([]);
  };

  const togglePermission = (tabKey: TabKey) => {
    setTempPermissions(prev => 
      prev.includes(tabKey) 
        ? prev.filter(t => t !== tabKey)
        : [...prev, tabKey]
    );
  };

  const savePermissions = async (userId: string) => {
    setSaving(true);
    try {
      await updatePermissions.mutateAsync({ userId, tabs: tempPermissions });
      toast({ title: 'Permissões atualizadas!' });
      setEditingUser(null);
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao salvar', 
        description: 'Não foi possível atualizar as permissões' 
      });
    }
    setSaving(false);
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await toggleAdmin.mutateAsync({ userId, makeAdmin: !currentIsAdmin });
      toast({ 
        title: currentIsAdmin ? 'Removido de admin' : 'Promovido a admin',
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro', 
        description: 'Não foi possível alterar o role' 
      });
    }
  };

  const openEditDialog = (user: { id: string; email: string; full_name: string | null }) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: { id: string; email: string; full_name: string | null }) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleUpdateUser = async (userId: string, data: { email?: string; fullName?: string }) => {
    await updateUser.mutateAsync({ userId, ...data });
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser.mutateAsync(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList>
        <TabsTrigger value="users" className="gap-2">
          <User className="h-4 w-4" />
          Usuários
        </TabsTrigger>
        <TabsTrigger value="closer-metas" className="gap-2">
          <Target className="h-4 w-4" />
          Metas por Closer
        </TabsTrigger>
        <TabsTrigger value="monetary-metas" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Metas Monetárias
        </TabsTrigger>
        <TabsTrigger value="cost-stage-metas" className="gap-2">
          <Gauge className="h-4 w-4" />
          Metas CPx
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-2">
          <History className="h-4 w-4" />
          Logs
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-gradient mb-2">
              Gerenciar Usuários
            </h2>
            <p className="text-muted-foreground">
              Controle quais abas cada usuário pode acessar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ChangePasswordDialog />
            <CreateUserForm 
              onCreateUser={handleCreateUser}
              isLoading={createUser.isPending}
            />
          </div>
        </div>

        <div className="grid gap-4">
        {users.map(user => {
          const isEditing = editingUser === user.id;
          const isAdmin = user.role === 'admin';

          return (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {isAdmin ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {user.full_name || 'Sem nome'}
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(user)}
                      title="Editar usuário"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDeleteDialog(user)}
                      title="Excluir usuário"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 ml-2">
                      <Switch
                        id={`admin-${user.id}`}
                        checked={isAdmin}
                        onCheckedChange={() => handleToggleAdmin(user.id, isAdmin)}
                      />
                      <Label htmlFor={`admin-${user.id}`} className="text-sm">
                        Admin
                      </Label>
                    </div>
                    {isAdmin && (
                      <Badge variant="secondary">Acesso total</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {!isAdmin && (
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {TAB_OPTIONS.map(tab => (
                          <div key={tab.key} className="flex items-center gap-2">
                            <Checkbox
                              id={`${user.id}-${tab.key}`}
                              checked={tempPermissions.includes(tab.key)}
                              onCheckedChange={() => togglePermission(tab.key)}
                            />
                            <Label 
                              htmlFor={`${user.id}-${tab.key}`}
                              className="text-sm cursor-pointer"
                            >
                              {tab.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => savePermissions(user.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Salvar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={cancelEditing}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {user.permissions.length > 0 ? (
                          user.permissions.map(perm => (
                            <Badge key={perm} variant="outline">
                              {TAB_OPTIONS.find(t => t.key === perm)?.label || perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Nenhuma aba liberada
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditing(user.id, user.permissions)}
                      >
                        Editar permissões
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSave={handleUpdateUser}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onDelete={handleDeleteUser}
      />
      </TabsContent>

      <TabsContent value="closer-metas">
        <CloserMetasTab />
      </TabsContent>

      <TabsContent value="monetary-metas">
        <MonetaryMetasTab />
      </TabsContent>

      <TabsContent value="cost-stage-metas">
        <CostStageMetasTab />
      </TabsContent>

      <TabsContent value="logs">
        <AdminLogsTab />
      </TabsContent>
    </Tabs>
  );
}
