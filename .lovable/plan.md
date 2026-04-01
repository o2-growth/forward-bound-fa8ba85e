

## Persistir Configurações do Plan Growth (Ticket Médio, CPMQL, CPV, Taxas)

### Problema

Os indicadores por BU (ticket médio, CPMQL, CPV, taxas de conversão) são armazenados apenas em `useState` com valores hardcoded. Qualquer alteração é perdida ao recarregar a página.

### Solução

Criar uma tabela no banco para persistir esses indicadores e adicionar lógica de load/save no componente.

### Etapas

**1. Criar tabela `bu_indicators_config`**

```sql
CREATE TABLE bu_indicators_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bu text NOT NULL,
  ticket_medio numeric NOT NULL DEFAULT 0,
  cpmql numeric NOT NULL DEFAULT 0,
  cpv numeric NOT NULL DEFAULT 0,
  mql_to_rm numeric NOT NULL DEFAULT 0,
  rm_to_rr numeric NOT NULL DEFAULT 0,
  rr_to_prop numeric NOT NULL DEFAULT 0,
  prop_to_venda numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bu)
);

ALTER TABLE bu_indicators_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read" ON bu_indicators_config FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert" ON bu_indicators_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update" ON bu_indicators_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete" ON bu_indicators_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed com valores default atuais
INSERT INTO bu_indicators_config (bu, ticket_medio, cpmql, cpv, mql_to_rm, rm_to_rr, rr_to_prop, prop_to_venda) VALUES
  ('modelo_atual', 17000, 472.72, 6517.05, 0.49, 0.72, 0.88, 0.24),
  ('o2_tax', 15000, 600, 2500, 0.45, 0.65, 0.80, 0.20),
  ('oxy_hacker', 54000, 800, 5000, 0.40, 0.60, 0.75, 0.15),
  ('franquia', 140000, 1200, 12000, 0.35, 0.55, 0.70, 0.12);
```

**2. Criar hook `useBUIndicatorsConfig`**

Novo arquivo `src/hooks/useBUIndicatorsConfig.ts`:
- Fetch dos 4 registros da tabela ao montar
- Função `saveIndicators(bu, indicators)` que faz upsert
- Retorna `{ data, isLoading, saveIndicators }`

**3. Modificar `MediaInvestmentTab.tsx`**

- Importar e usar `useBUIndicatorsConfig`
- Inicializar `indicadoresPorBU` com dados do banco (fallback para hardcoded)
- Adicionar botão "Salvar Configurações" dentro do collapsible de configurações
- No clique, chamar `saveIndicators` para cada BU alterada e exibir toast de confirmação

### Resultado

As configurações serão persistidas no banco. Ao alterar ticket médio, taxas, etc., o usuário clica em "Salvar" e os valores ficam disponíveis entre sessões.

