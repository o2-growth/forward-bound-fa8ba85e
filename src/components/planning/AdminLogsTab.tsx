import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Calendar, TrendingUp, DollarSign, Target } from 'lucide-react';
import { useAuditLogsList, useAuditLogStats, type ActionType } from '@/hooks/useAuditLogs';

const BU_OPTIONS = [
  { value: 'all', label: 'Todas as BUs' },
  { value: 'modelo_atual', label: 'Modelo Atual' },
  { value: 'o2_tax', label: 'O2 TAX' },
  { value: 'oxy_hacker', label: 'Oxy Hacker' },
  { value: 'franquia', label: 'Franquia' },
];

const ACTION_LABELS: Record<string, string> = {
  monetary_meta: 'Meta Monetária',
  closer_meta: 'Meta Closer',
  plan_growth_meta: 'Plan Growth',
};

export function AdminLogsTab() {
  const [actionType, setActionType] = useState<ActionType | 'all'>('all');
  const [bu, setBu] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);

  const filters = { actionType, bu, startDate: startDate || undefined, endDate: endDate || undefined };
  const { data: logs, isLoading } = useAuditLogsList(filters, page);
  const { data: stats } = useAuditLogStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gradient mb-2">
          Histórico de Alterações
        </h2>
        <p className="text-muted-foreground">
          Registro de todas as alterações feitas nas metas de vendas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.thisWeek ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.thisMonth ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.monetary ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Monetárias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.closer ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Closer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select value={actionType} onValueChange={(v) => { setActionType(v as any); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="monetary_meta">Meta Monetária</SelectItem>
                  <SelectItem value="closer_meta">Meta Closer</SelectItem>
                  <SelectItem value="plan_growth_meta">Plan Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">BU</label>
              <Select value={bu} onValueChange={(v) => { setBu(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BU_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">De</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                className="w-[160px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Até</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                className="w-[160px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !logs?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="min-w-[300px]">Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-sm">{log.user_email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.action_type === 'monetary_meta'
                              ? 'border-blue-500/50 text-blue-600'
                              : log.action_type === 'plan_growth_meta'
                              ? 'border-amber-500/50 text-amber-600'
                              : 'border-green-500/50 text-green-600'
                          }
                        >
                          {ACTION_LABELS[log.action_type] || log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(logs?.length ?? 0) < 20}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
