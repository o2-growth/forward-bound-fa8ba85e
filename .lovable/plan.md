# G4 Real: funil por live clicável com detalhamento de leads

## Objetivo
Tornar cada etapa (Inscritos, Presentes, Levantaram a mão, Vendas, Diagnósticos) de cada card de live clicável e abrir um drawer/dialog com a lista de leads correspondentes, mostrando **nome, empresa, email, fase atual, closer** e link para o Pipefy.

## Como fazer

### 1. Filtrar leads por live+etapa no cliente
Já temos `data.leads: G4RealLead[]` — cada lead traz `lives[]`, `presenteAlgumaLive`, `levantouMao`, `liveDaMao`, `fezDiagnostico`, `noPipe`, `faseAtual`, `closer`, `pipefyUrl`.

Regras por etapa (dado um `live`):
- **Inscritos** → `leads.filter(l => l.lives.includes(live))`
- **Presentes** → mesmo + `l.presenteAlgumaLive` (obs.: o dado atual é "presente em alguma live", não por live específica — vamos exibir isso como caveat no header do drawer)
- **Levantaram a mão** → `l.lives.includes(live) && l.levantouMao && (l.liveDaMao === live || traction)`
- **Vendas** → `l.lives.includes(live) && l.faseAtual === 'Ganho'`
- **Diagnósticos** → `l.lives.includes(live) && l.fezDiagnostico`

Para lives de **Traction**, mostramos os leads em "Levantaram a mão" (0 inscritos/presentes, conforme já definido no edge function).

### 2. Novo componente `LiveDetailDialog`
- Dialog reutilizando shadcn `Dialog` (padrão de `LiveLeadsDialog` existente).
- Cabeçalho: nome da live + badge com etapa + contagem.
- Tabela: Nome/Email, Empresa, Fase atual, Closer, Mão (badge), Diag (badge), botão "Abrir no Pipefy".
- Se etapa = Presentes e o dado é "alguma live", mostrar aviso amarelo curto.

### 3. Tornar as células clicáveis em `LiveFunnelCard`
- Cada bloco do grid vira `<button>` com hover/focus visual (mantém o layout atual).
- Bloco "Diagnósticos" no rodapé também vira botão.
- Callback `onOpenStage(live, stage)` sobe para `G4RealSection`, que abre o dialog com os leads filtrados.

### 4. Estado no `G4RealSection`
- `const [detail, setDetail] = useState<{ live: string; stage: Stage } | null>(null)`
- Deriva `filteredLeadsForDetail` conforme regras acima e passa para o dialog.

## Fora de escopo
- Nada de mudança em edge function nem schema — puramente frontend, consumindo o payload que já vem.
- Não altero a tabela de leads geral nem os KPIs de topo.
- Sem novos endpoints; se "Presentes por live específica" precisar vir da fonte, fica para depois.
