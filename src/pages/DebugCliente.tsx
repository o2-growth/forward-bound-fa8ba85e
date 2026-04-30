import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

async function searchTable(table: string, searchTerm: string, searchColumn: string) {
  const { data, error } = await supabase.functions.invoke('query-external-db', {
    body: { table, action: 'search', searchTerm, searchColumn, limit: 50 },
  });
  if (error) throw error;
  return (data?.data || []) as any[];
}

async function previewTable(table: string, limit = 2000) {
  const { data, error } = await supabase.functions.invoke('query-external-db', {
    body: { table, action: 'preview', limit },
  });
  if (error) throw error;
  return (data?.data || []) as any[];
}

export default function DebugCliente() {
  const { titulo } = useParams<{ titulo: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projetoRows, setProjetoRows] = useState<any[]>([]);
  const [clienteRows, setClienteRows] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    if (!titulo) return;
    const run = async () => {
      try {
        const decodedTitulo = decodeURIComponent(titulo);
        // 1. Search projetos
        const projetos = await searchTable('pipefy_central_projetos', decodedTitulo, 'Título');
        setProjetoRows(projetos);

        // 2. Get card_connections (no search by title, fetch all)
        const allConnections = await previewTable('pipefy_card_connections', 2000);
        // Filter to connections involving any of our project IDs
        const projectIds = new Set(projetos.map(p => String(p.ID)));
        const relevantConnections = allConnections.filter((c: any) =>
          projectIds.has(String(c.card_id || ''))
        );
        setConnections(relevantConnections);

        // 3. Search db_clientes by title (cliente cards have same title as projetos)
        const clientes = await searchTable('pipefy_db_clientes', decodedTitulo, 'Título');
        setClienteRows(clientes);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [titulo]);

  if (loading) return <div className="p-8 text-foreground">Carregando dados de "{titulo}"...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error}</div>;

  return (
    <div className="p-8 space-y-6 bg-background text-foreground min-h-screen">
      <h1 className="text-2xl font-bold">Debug Cliente — {decodeURIComponent(titulo || '')}</h1>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">📋 pipefy_central_projetos ({projetoRows.length} registros)</h2>
        {projetoRows.length === 0 && <div className="text-red-400 text-sm">Nenhum projeto encontrado com esse título</div>}
        {projetoRows.map((row, i) => {
          const isCurrent = row['Fase'] === row['Fase Atual'];
          return (
            <div key={i} className="border rounded p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <strong>Registro {i + 1} — ID {row.ID}</strong>
                <span className={`px-2 py-0.5 rounded text-xs ${isCurrent ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {isCurrent ? '✅ Current' : 'Histórico'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Fase:</span> {row['Fase']}</div>
                <div><span className="text-muted-foreground">Fase Atual:</span> {row['Fase Atual']}</div>
                <div><span className="text-muted-foreground">CFO:</span> {row['CFO Responsavel']}</div>
                <div><span className="text-muted-foreground">Entrada:</span> <code>{row['Entrada']}</code></div>
                <div className="col-span-2 bg-yellow-500/10 p-2 rounded">
                  <span className="text-yellow-400 text-xs uppercase">⚠️ Data de assinatura no projeto:</span>
                  <div className="font-mono">{row['Data de assinatura do contrato'] || row['Data assinatura'] || '(null)'}</div>
                </div>
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">Ver row completo</summary>
                <pre className="text-xs bg-muted/30 p-2 rounded mt-2 overflow-auto max-h-64">{JSON.stringify(row, null, 2)}</pre>
              </details>
            </div>
          );
        })}
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">🔗 pipefy_card_connections ({connections.length} conexões para esses projetos)</h2>
        {connections.length === 0 && <div className="text-yellow-400 text-sm">Nenhuma conexão encontrada — projeto não está ligado a um cliente em DB Clientes</div>}
        {connections.map((c, i) => (
          <div key={i} className="border rounded p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">card_id (projeto):</span> {c.card_id}</div>
            <div><span className="text-muted-foreground">connected_card_id:</span> {c.connected_card_id}</div>
            <div><span className="text-muted-foreground">connected_card_title:</span> <strong>{c.connected_card_title}</strong></div>
            <div><span className="text-muted-foreground">connected_pipe_name:</span> {c.connected_pipe_name}</div>
            <div><span className="text-muted-foreground">relation_name:</span> {c.relation_name}</div>
          </div>
        ))}
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">👤 pipefy_db_clientes ({clienteRows.length} registros)</h2>
        {clienteRows.length === 0 && <div className="text-red-400 text-sm">Nenhum cliente encontrado em DB Clientes com esse título</div>}
        {clienteRows.map((row, i) => (
          <div key={i} className="border rounded p-3 text-sm space-y-2">
            <strong>Registro {i + 1} — ID {row.ID}</strong>
            <div className="bg-yellow-500/10 p-3 rounded space-y-1">
              <div className="text-yellow-400 text-xs uppercase font-semibold">⭐ Data de assinatura do contrato</div>
              <div className="font-mono text-lg">{row['Data de assinatura do contrato'] || '(null)'}</div>
              <div className="text-xs text-muted-foreground">Outras datas relacionadas:</div>
              <div className="font-mono text-xs">Data assinatura: {row['Data assinatura'] || '(null)'}</div>
              <div className="font-mono text-xs">Data início contrato: {row['Data início contrato'] || row['Data Inicio Contrato'] || '(null)'}</div>
              <div className="font-mono text-xs">Data Kickoff: {row['Data Kickoff'] || '(null)'}</div>
              <div className="font-mono text-xs">Início Operação: {row['Início Operação'] || row['Inicio Operacao'] || '(null)'}</div>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Ver row completo (todos os campos)</summary>
              <pre className="text-xs bg-muted/30 p-2 rounded mt-2 overflow-auto max-h-96">{JSON.stringify(row, null, 2)}</pre>
            </details>
          </div>
        ))}
      </section>
    </div>
  );
}
