import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertTriangle, ListTodo, ThumbsDown, MessageCircleOff, XCircle, ExternalLink, Check, Eye, EyeOff } from "lucide-react";
import type { JornadaAlerta } from "./types";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatBRL(value);
};

const ALERT_ICONS: Record<JornadaAlerta["tipo"], React.ComponentType<{ className?: string }>> = {
  setup_atrasado: Clock,
  tratativa_aberta: AlertTriangle,
  tarefa_atrasada: ListTodo,
  nps_detrator: ThumbsDown,
  sem_nps: MessageCircleOff,
  churn: XCircle,
};

const SEV_CONFIG: Record<JornadaAlerta["severidade"], { label: string; border: string; bg: string; bgRead: string; text: string }> = {
  critico: { label: "Críticos", border: "border-red-400", bg: "bg-red-50 dark:bg-red-950", bgRead: "bg-muted/30", text: "text-red-700 dark:text-red-300" },
  alto: { label: "Altos", border: "border-amber-400", bg: "bg-amber-50 dark:bg-amber-950", bgRead: "bg-muted/30", text: "text-amber-700 dark:text-amber-300" },
  medio: { label: "Médios", border: "border-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950", bgRead: "bg-muted/30", text: "text-yellow-700 dark:text-yellow-300" },
};

const STORAGE_KEY = 'jornada-alertas-lidos';

function getReadAlerts(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveReadAlerts(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function alertKey(a: JornadaAlerta): string {
  return `${a.clienteId}|${a.tipo}`;
}

type FilterTab = "todos" | "critico" | "alto" | "medio" | "nao_lidos" | "lidos";

interface AlertasViewProps {
  alertas: JornadaAlerta[];
}

export function AlertasView({ alertas }: AlertasViewProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("nao_lidos");
  const [readIds, setReadIds] = useState<Set<string>>(getReadAlerts);

  const toggleRead = useCallback((alerta: JornadaAlerta) => {
    setReadIds(prev => {
      const next = new Set(prev);
      const key = alertKey(alerta);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveReadAlerts(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      for (const a of alertas) next.add(alertKey(a));
      saveReadAlerts(next);
      return next;
    });
  }, [alertas]);

  const clearAllRead = useCallback(() => {
    setReadIds(new Set());
    saveReadAlerts(new Set());
  }, []);

  const unreadCount = alertas.filter(a => !readIds.has(alertKey(a))).length;
  const readCount = alertas.filter(a => readIds.has(alertKey(a))).length;

  const filtered = useMemo(() => {
    let list = alertas;
    if (activeTab === "nao_lidos") list = list.filter(a => !readIds.has(alertKey(a)));
    else if (activeTab === "lidos") list = list.filter(a => readIds.has(alertKey(a)));
    else if (activeTab !== "todos") list = list.filter(a => a.severidade === activeTab);
    return list;
  }, [alertas, activeTab, readIds]);

  const counts = useMemo(() => {
    const unread = alertas.filter(a => !readIds.has(alertKey(a)));
    const critico = unread.filter(a => a.severidade === "critico").length;
    const alto = unread.filter(a => a.severidade === "alto").length;
    const medio = unread.filter(a => a.severidade === "medio").length;
    const mrrRisco = unread.reduce((s, a) => s + (a.valor || 0), 0);
    return { critico, alto, medio, total: unread.length, mrrRisco };
  }, [alertas, readIds]);

  const grouped = useMemo(() => {
    const groups: Record<string, JornadaAlerta[]> = { critico: [], alto: [], medio: [] };
    for (const a of filtered) {
      groups[a.severidade]?.push(a);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0) as [JornadaAlerta["severidade"], JornadaAlerta[]][];
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="nao_lidos">
              Não lidos ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="todos">Todos ({alertas.length})</TabsTrigger>
            <TabsTrigger value="critico">Críticos</TabsTrigger>
            <TabsTrigger value="alto">Altos</TabsTrigger>
            <TabsTrigger value="medio">Médios</TabsTrigger>
            <TabsTrigger value="lidos">Lidos ({readCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 ml-auto">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3" />
              Marcar todos como lidos
            </Button>
          )}
          {readCount > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={clearAllRead}>
              Limpar lidos
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPIs (unread only) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <span className="text-xl font-bold text-red-600">{counts.critico}</span>
          <span className="text-xs text-muted-foreground">Críticos</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <span className="text-xl font-bold text-amber-600">{counts.alto}</span>
          <span className="text-xs text-muted-foreground">Altos</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <span className="text-xl font-bold text-yellow-600">{counts.medio}</span>
          <span className="text-xs text-muted-foreground">Médios</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-muted/50">
          <span className="text-xl font-bold text-red-600">{formatCompact(counts.mrrRisco)}</span>
          <span className="text-xs text-muted-foreground">MRR em Risco</span>
        </div>
      </div>

      {/* Grouped Alerts */}
      {grouped.map(([severidade, items]) => {
        const config = SEV_CONFIG[severidade];
        return (
          <div key={severidade} className="space-y-2">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${config.text}`}>
              {config.label} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((alerta, idx) => {
                const Icon = ALERT_ICONS[alerta.tipo];
                const isRead = readIds.has(alertKey(alerta));
                return (
                  <div
                    key={`${alerta.clienteId}-${alerta.tipo}-${idx}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all ${config.border} ${isRead ? config.bgRead + ' opacity-60' : config.bg}`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isRead ? 'text-muted-foreground' : config.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${isRead ? 'text-muted-foreground' : ''}`}>{alerta.cliente}</span>
                        <a href={`https://app.pipefy.com/open-cards/${alerta.clienteId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                        <Badge variant="outline" className="text-xs">{alerta.cfo}</Badge>
                        {isRead && <Badge variant="secondary" className="text-[10px]">Lido</Badge>}
                      </div>
                      <p className={`text-sm mt-0.5 ${isRead ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{alerta.descricao}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        {alerta.dias != null && (
                          <span className="text-xs text-muted-foreground block">{alerta.dias}d</span>
                        )}
                        {alerta.valor != null && alerta.valor > 0 && (
                          <span className="text-xs font-medium text-red-600">{formatCompact(alerta.valor)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleRead(alerta)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        title={isRead ? "Marcar como não lido" : "Marcar como lido"}
                      >
                        {isRead ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {activeTab === 'nao_lidos' ? 'Todos os alertas foram lidos!' : activeTab === 'lidos' ? 'Nenhum alerta marcado como lido.' : 'Nenhum alerta encontrado.'}
        </div>
      )}
    </div>
  );
}
