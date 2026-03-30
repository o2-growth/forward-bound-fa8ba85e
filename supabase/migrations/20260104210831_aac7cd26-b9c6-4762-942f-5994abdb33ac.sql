-- Fix 1: Remove public read access to sales_realized - require authentication
DROP POLICY IF EXISTS "Anyone can read sales data" ON public.sales_realized;

CREATE POLICY "Authenticated users can read sales data" 
ON public.sales_realized 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict UPDATE to admins only
DROP POLICY IF EXISTS "Authenticated users can update sales data" ON public.sales_realized;

CREATE POLICY "Only admins can update sales data" 
ON public.sales_realized 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));