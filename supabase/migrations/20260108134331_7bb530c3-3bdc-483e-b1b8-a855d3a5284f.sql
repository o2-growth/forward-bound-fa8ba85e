-- Fix 1: Restrict funnel_realized INSERT to admins only
DROP POLICY IF EXISTS "Authenticated users can insert funnel data" ON public.funnel_realized;

CREATE POLICY "Only admins can insert funnel data"
ON public.funnel_realized
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add explicit DELETE policy for sales_realized
CREATE POLICY "Only admins can delete sales data"
ON public.sales_realized
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));