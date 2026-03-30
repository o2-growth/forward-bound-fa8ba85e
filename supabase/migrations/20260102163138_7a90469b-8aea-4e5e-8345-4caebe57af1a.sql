-- Tabela para armazenar vendas realizadas por BU e mês
CREATE TABLE public.sales_realized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu TEXT NOT NULL CHECK (bu IN ('modelo_atual', 'o2_tax', 'oxy_hacker', 'franquia')),
  month TEXT NOT NULL CHECK (month IN ('Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez')),
  year INTEGER NOT NULL DEFAULT 2026,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (bu, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.sales_realized ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (dados de vendas são informações da empresa)
CREATE POLICY "Anyone can read sales data" 
ON public.sales_realized 
FOR SELECT 
USING (true);

-- Política para inserção (apenas usuários autenticados)
CREATE POLICY "Authenticated users can insert sales data" 
ON public.sales_realized 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política para atualização (apenas usuários autenticados)
CREATE POLICY "Authenticated users can update sales data" 
ON public.sales_realized 
FOR UPDATE 
TO authenticated
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_sales_realized_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sales_realized_updated_at
BEFORE UPDATE ON public.sales_realized
FOR EACH ROW
EXECUTE FUNCTION public.update_sales_realized_updated_at();

-- Inserir dados de exemplo para testes (valores zerados para serem preenchidos depois)
INSERT INTO public.sales_realized (bu, month, year, value) VALUES
('modelo_atual', 'Jan', 2026, 0),
('modelo_atual', 'Fev', 2026, 0),
('modelo_atual', 'Mar', 2026, 0),
('o2_tax', 'Jan', 2026, 0),
('o2_tax', 'Fev', 2026, 0),
('o2_tax', 'Mar', 2026, 0),
('oxy_hacker', 'Jan', 2026, 0),
('oxy_hacker', 'Fev', 2026, 0),
('oxy_hacker', 'Mar', 2026, 0),
('franquia', 'Jan', 2026, 0),
('franquia', 'Fev', 2026, 0),
('franquia', 'Mar', 2026, 0);