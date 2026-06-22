
CREATE TABLE public.cfo_squad_assignment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cfo_squad_nome TEXT NOT NULL,
  pessoa_nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cfo','analyst')),
  pessoa_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pessoa_nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cfo_squad_assignment TO authenticated;
GRANT ALL ON public.cfo_squad_assignment TO service_role;

ALTER TABLE public.cfo_squad_assignment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read squad assignments"
  ON public.cfo_squad_assignment FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert squad assignments"
  ON public.cfo_squad_assignment FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update squad assignments"
  ON public.cfo_squad_assignment FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete squad assignments"
  ON public.cfo_squad_assignment FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cfo_squad_assignment_updated
  BEFORE UPDATE ON public.cfo_squad_assignment
  FOR EACH ROW EXECUTE FUNCTION public.update_sales_realized_updated_at();

INSERT INTO public.cfo_squad_assignment (cfo_squad_nome, pessoa_nome, role) VALUES
  ('Oliveira','Adivilso Souza de Oliveira Junior','cfo'),
  ('Oliveira','Pedro Fuzer Garcia','analyst'),
  ('Douglas Schossler','Douglas Pinheiro Schossler','cfo'),
  ('Douglas Schossler','Tainara Sofia Konzen','analyst'),
  ('Eduardo Milani Pedrolo','Eduardo Milani Pedrolo','cfo'),
  ('Eduardo Milani Pedrolo','Sergio Pereira Piva Junior','analyst'),
  ('Eduardo Milani Pedrolo','Felipe Vargas Brenner','analyst'),
  ('Eduardo Milani Pedrolo','Eric Alves da Silveira','analyst'),
  ('Eduardo Milani Pedrolo','Pedro Oppermann Michelucci Pimenta','analyst'),
  ('Everton Bisinella','Everton Bisinella','cfo'),
  ('Everton Bisinella','Anderson Felizardo Mendes','analyst'),
  ('Everton Bisinella','Maria Eduarda Nery Reckziegel','analyst'),
  ('Gustavo Cochlar','Gustavo Ferreira Cochlar','cfo'),
  ('Gustavo Cochlar','Humberto de Azevedo Behs','analyst'),
  ('Eduardo D''Agostini','Luis Eduardo Dagostini','cfo'),
  ('Eduardo D''Agostini','Pamela Luiza dos Santos Quadros','analyst'),
  ('Eduardo D''Agostini','Matheus da Silva Besnos','analyst'),
  ('Mariana Luz da Silva','Mariana Luz da Silva','cfo'),
  ('Mariana Luz da Silva','Raissa Bonamigo Daros','analyst'),
  ('Rafael Marchioretto','Rafael Marchioretto Bokorni','cfo'),
  ('Rafael Marchioretto','Roberta Costa Curta Lirio','analyst');
