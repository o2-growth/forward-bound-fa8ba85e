import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Filter, X, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useJornadaData } from "@/hooks/useJornadaData";
import { PipelineView } from "./jornada/PipelineView";
import { ClientesView } from "./jornada/ClientesView";
import { CfoView } from "./jornada/CfoView";
import { AlertasView } from "./jornada/AlertasView";
import { ReunioesView } from "./jornada/ReunioesView";
import type { JornadaFilter, JornadaCliente, JornadaCfo, PipelineFase } from "./jornada/types";

export function JornadaTab() {
  const { clientes, cfos, alertas, pipeline, reunioes, allCfos, allProdutos, isLoading, error } = useJornadaData();

  const [filters, setFilters] = useState<JornadaFilter>({ cfo: [], produto: [], healthLevel: [] });

  const toggleFilter = <K extends keyof JornadaFilter>(key: K, value: JornadaFilter[K][number]) => {
    setFilters(prev => {
      const arr = prev[key] as JornadaFilter[K][number][];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const hasFilters = filters.cfo.length > 0 || filters.produto.length > 0 || filters.healthLevel.length > 0;

  const INACTIVE = ['Churn', 'Atividades finalizadas', 'Desistência', 'Arquivado'];

  const activeOnly = useMemo(() => {
    return clientes.filter(c => !INACTIVE.includes(c.faseAtual));
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    if (!hasFilters) return activeOnly;
    return activeOnly.filter(c => {
      if (filters.cfo.length > 0 && !filters.cfo.includes(c.cfo)) return false;
      if (filters.produto.length > 0 && !filters.produto.includes(c.produto)) return false;
      if (filters.healthLevel.length > 0 && !filters.healthLevel.includes(c.healthLevel)) return false;
      return true;
    });
  }, [activeOnly, filters, hasFilters]);

  const filteredCfos = useMemo((): JornadaCfo[] => {
    if (!hasFilters) return cfos;
    const cfoNames = [...new Set(filteredClientes.map(c => c.cfo).filter(Boolean))];
    return cfos.filter(cfo => cfoNames.includes(cfo.nome));
  }, [cfos, filteredClientes, hasFilters]);

  const filteredPipeline = useMemo((): PipelineFase[] => {
    if (!hasFilters) return pipeline;
    return pipeline.map(fase => {
      const cls = fase.clientes.filter(c => filteredClientes.some(fc => fc.id === c.id));
      return { ...fase, count: cls.length, mrr: cls.reduce((s, c) => s + c.mrr, 0), clientes: cls };
    }).filter(f => f.count > 0);
  }, [pipeline, filteredClientes, hasFilters]);

  const filteredAlertas = useMemo(() => {
    if (!hasFilters) return alertas;
    const ids = new Set(filteredClientes.map(c => c.id));
    return alertas.filter(a => ids.has(a.clienteId));
  }, [alertas, filteredClientes, hasFilters]);

  const filteredReunioes = useMemo(() => {
    if (filters.cfo.length === 0) return reunioes;
    return reunioes.filter(r => filters.cfo.includes(r.cfo));
  }, [reunioes, filters.cfo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando dados da jornada...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-destructive">
        Erro ao carregar dados: {(error as Error).message}
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <p>Jornada do Cliente — visão 360 de pipeline, clientes, reuniões, CFOs e alertas. Fonte: Pipefy</p>
          </TooltipContent>
        </Tooltip>

        {/* CFO Select */}
        <Select
          value={filters.cfo.length === 1 ? filters.cfo[0] : filters.cfo.length > 1 ? '__multi__' : 'all'}
          onValueChange={(v) => {
            if (v === 'all') setFilters(f => ({ ...f, cfo: [] }));
            else setFilters(f => ({ ...f, cfo: [v] }));
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="CFO" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os CFOs</SelectItem>
            {allCfos.map(cfo => (
              <SelectItem key={cfo} value={cfo}>{cfo}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Produto Select */}
        <Select
          value={filters.produto.length === 1 ? filters.produto[0] : filters.produto.length > 1 ? '__multi__' : 'all'}
          onValueChange={(v) => {
            if (v === 'all') setFilters(f => ({ ...f, produto: [] }));
            else setFilters(f => ({ ...f, produto: [v] }));
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {allProdutos.map(prod => (
              <SelectItem key={prod} value={prod}>{prod}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Health Level */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Health:</span>
          {([["green", "bg-green-500", "Bom"], ["yellow", "bg-yellow-500", "Atencao"], ["red", "bg-red-500", "Critico"]] as const).map(([level, color, label]) => (
            <button
              key={level}
              onClick={() => toggleFilter("healthLevel", level)}
              title={label}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color} ${
                filters.healthLevel.includes(level) ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-30 hover:opacity-60"
              }`}
            />
          ))}
        </div>

        {/* Active filters + Clear */}
        {hasFilters && (
          <>
            <div className="flex gap-1 flex-wrap">
              {filters.cfo.map(c => (
                <Badge key={c} variant="default" className="gap-1 text-xs">
                  {c}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("cfo", c)} />
                </Badge>
              ))}
              {filters.produto.map(p => (
                <Badge key={p} variant="secondary" className="gap-1 text-xs">
                  {p}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("produto", p)} />
                </Badge>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilters({ cfo: [], produto: [], healthLevel: [] })}>
              Limpar
            </Button>
          </>
        )}

      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
          <TabsTrigger value="cfos">CFOs</TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas
            {filteredAlertas.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                {filteredAlertas.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineView pipeline={filteredPipeline} clientes={filteredClientes} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ClientesView clientes={filteredClientes} />
        </TabsContent>

        <TabsContent value="reunioes" className="mt-4">
          <ReunioesView reunioes={filteredReunioes} allCfos={allCfos} clientes={filteredClientes} />
        </TabsContent>

        <TabsContent value="cfos" className="mt-4">
          <CfoView cfos={filteredCfos} clientes={filteredClientes} />
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <AlertasView alertas={filteredAlertas} />
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
