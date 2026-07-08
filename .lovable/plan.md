## Objetivo
Validar que o botão "Pipefy" (tanto na tabela externa quanto no diálogo de detalhamento) abre o destino correto no Pipefy em três cenários:

1. Lead **com `pipefy_url` direto** → deve abrir o card específico (`https://app.pipefy.com/open-cards/<id>` ou URL salva).
2. Lead **sem `pipefy_url` mas com e-mail** → deve abrir a busca do Pipefy (`https://app.pipefy.com/search?query=<email>`) e retornar o card correspondente.
3. Lead **sem URL e sem e-mail** → deve exibir `—` (sem botão).

## Passos de validação

### 1. Inspeção de dados (edge function)
- Chamar `g4-metrics` via `supabase--curl_edge_functions` e coletar amostra de `leads[]`.
- Contar quantos têm `pipefyUrl` populado vs. `null`, e quantos dos nulos têm `email`.
- Escolher 3 leads representativos (um de cada cenário).

### 2. Verificação da URL construída
- Para cada lead da amostra, executar `buildPipefyUrl` mentalmente (ou via script Node rápido) e conferir o formato:
  - Cenário 1: começa com `https://app.pipefy.com/open-cards/` ou domínio Pipefy salvo.
  - Cenário 2: `https://app.pipefy.com/search?query=` + e-mail URL-encoded.
  - Cenário 3: retorna `null` → UI mostra `—`.

### 3. Teste visual + navegação (Playwright)
- Rodar Playwright headless em `http://localhost:8080`, autenticar via sessão injetada, navegar até a aba G4 → seção "Dados reais das lives G4".
- Capturar screenshot da tabela mostrando botão "Pipefy" em linhas com/sem URL direta.
- Abrir o diálogo de uma live (clicar em "Inscritos"), capturar screenshot da coluna Ação.
- Extrair os `href` reais dos 3 leads-alvo com `page.get_by_role("link", name="Pipefy")` + `get_attribute("href")` e conferir que batem com o esperado.
- Para o cenário 2, opcionalmente abrir a URL de busca em nova aba (Playwright) e verificar que a página do Pipefy carrega resultados com o card do lead (visual assertion via screenshot; login do Pipefy pode bloquear — nesse caso apenas confirmar que a URL foi construída corretamente e o link abre no domínio certo).

### 4. Relatório
Retornar ao usuário:
- Contagem de leads por cenário na amostra.
- Screenshots (`tabela.png`, `dialog.png`) evidenciando o botão.
- Tabela markdown com `nome | email | pipefyUrl | href-gerado | cenário` para os 3 casos.
- Status final: OK / divergências encontradas.

## Fora de escopo
- Nenhuma alteração de código: esta tarefa é apenas verificação.
- Não abrir cards do Pipefy autenticando com credenciais reais — o Pipefy exige login e não temos sessão nele; a validação para do lado da URL construída + comportamento do link.
