import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function DebugReuniao() {
  const { cardId } = useParams<{ cardId: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cardId) return;
    const run = async () => {
      try {
        const { data: result, error: err } = await supabase.functions.invoke('query-external-db', {
          body: {
            table: 'pipefy_moviment_rotinas',
            action: 'search',
            searchTerm: cardId,
            searchColumn: 'ID',
            limit: 50,
          },
        });
        if (err) throw err;
        setData(result);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [cardId]);

  if (loading) return <div className="p-8 text-foreground">Carregando card {cardId}...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error}</div>;

  const rows: any[] = data?.data || [];

  const REUNIAO_EXCLUDE = ['Cancelado', 'Cancelada', 'Arquivado', 'Arquivo'];

  return (
    <div className="p-8 space-y-6 bg-background text-foreground min-h-screen">
      <h1 className="text-2xl font-bold">Debug Reunião — Card {cardId}</h1>
      <div className="text-sm text-muted-foreground">
        Tabela: <code>pipefy_moviment_rotinas</code> | Registros encontrados: {rows.length}
      </div>

      {rows.length === 0 && (
        <div className="p-4 rounded border border-red-500/30 bg-red-500/10">
          ❌ Card NÃO encontrado em <code>pipefy_moviment_rotinas</code>. Possíveis causas:
          <ul className="list-disc ml-6 mt-2 text-sm">
            <li>ID inexistente nessa tabela (talvez esteja em outra pipe)</li>
            <li>Sync do Pipefy ainda não trouxe esse card</li>
          </ul>
        </div>
      )}

      {rows.map((row, i) => {
        const passFaseAtual = row['Fase'] === row['Fase Atual'];
        const tipo = row['Tipo de Entrega'] || '';
        const passTipo = tipo === 'Reuniões com Cliente';
        const fase = row['Fase Atual'] || '';
        const passExclude = !REUNIAO_EXCLUDE.some(t => fase.includes(t));
        const incluido = passFaseAtual && passTipo && passExclude;

        return (
          <div key={i} className="rounded border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registro {i + 1} de {rows.length}</h2>
              <span className={`px-3 py-1 rounded text-xs font-bold ${incluido ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {incluido ? '✅ INCLUÍDO no dashboard' : '❌ EXCLUÍDO do dashboard'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Título:</span> <strong>{row['Título']}</strong></div>
              <div><span className="text-muted-foreground">CFO:</span> {row['CFO Responsavel']}</div>
              <div><span className="text-muted-foreground">Fase:</span> {row['Fase']}</div>
              <div><span className="text-muted-foreground">Fase Atual:</span> {row['Fase Atual']}</div>
              <div><span className="text-muted-foreground">Tipo de Entrega:</span> <code>{tipo || '(vazio)'}</code></div>
              <div><span className="text-muted-foreground">Mes Referência:</span> {row['Mes Referencia']}</div>
              <div><span className="text-muted-foreground">Cliente Participou:</span> {row['Cliente Participou'] || '—'}</div>
              <div><span className="text-muted-foreground">Selecao Reuniao:</span> {row['Selecao Reuniao'] || '—'}</div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h3 className="text-sm font-semibold">Datas das Reuniões (R1-R4)</h3>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">R1 (Data Reuniao 1)</div>
                  <div className="font-mono">{row['Data Reuniao 1'] || '(null)'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Temp 1: {row['Temperatura 1'] || '—'}</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">R2 (Data Reuniao 2)</div>
                  <div className="font-mono">{row['Data Reuniao 2'] || '(null)'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Temp 2: {row['Temperatura 2'] || '—'}</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">R3 (Data Reuniao 3)</div>
                  <div className="font-mono">{row['Data Reuniao 3'] || '(null)'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Temp 3: {row['Temperatura 3'] || '—'}</div>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <div className="text-xs text-muted-foreground">Comitê (Data Mensal)</div>
                  <div className="font-mono">{row['Data Mensal'] || '(null)'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Temp Mensal: {row['Temperatura Mensal'] || '—'}</div>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-sm font-semibold mb-2">Diagnóstico dos Filtros</h3>
              <ul className="text-sm space-y-1">
                <li className={passFaseAtual ? 'text-green-400' : 'text-red-400'}>
                  {passFaseAtual ? '✅' : '❌'} Fase ({row['Fase']}) === Fase Atual ({row['Fase Atual']})
                </li>
                <li className={passTipo ? 'text-green-400' : 'text-red-400'}>
                  {passTipo ? '✅' : '❌'} Tipo de Entrega === 'Reuniões com Cliente' (atual: <code>{tipo || 'vazio'}</code>)
                </li>
                <li className={passExclude ? 'text-green-400' : 'text-red-400'}>
                  {passExclude ? '✅' : '❌'} Fase Atual não contém Cancelado/Arquivado
                </li>
              </ul>
            </div>

            <details className="border-t pt-3">
              <summary className="text-sm font-semibold cursor-pointer">Ver row completo (todos os campos)</summary>
              <pre className="text-xs bg-muted/30 p-3 rounded mt-2 overflow-auto max-h-96">
                {JSON.stringify(row, null, 2)}
              </pre>
            </details>
          </div>
        );
      })}
    </div>
  );
}
