-- Add 'cfo' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cfo';

-- Create cfo_user_mapping table
CREATE TABLE public.cfo_user_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  cfo_name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cfo_user_mapping TO authenticated;
GRANT ALL ON public.cfo_user_mapping TO service_role;

ALTER TABLE public.cfo_user_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cfo mapping"
  ON public.cfo_user_mapping FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all cfo mappings"
  ON public.cfo_user_mapping FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert cfo mappings"
  ON public.cfo_user_mapping FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cfo mappings"
  ON public.cfo_user_mapping FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cfo mappings"
  ON public.cfo_user_mapping FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper function to fetch the current user's mapped CFO name
CREATE OR REPLACE FUNCTION public.get_my_cfo_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cfo_name FROM public.cfo_user_mapping WHERE user_id = auth.uid() LIMIT 1;
$$;

-- updated_at trigger
CREATE TRIGGER set_cfo_user_mapping_updated_at
BEFORE UPDATE ON public.cfo_user_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_sales_realized_updated_at();
