-- Drop the existing INSERT policy that doesn't check authentication
DROP POLICY IF EXISTS "Authenticated users can insert sales data" ON public.sales_realized;

-- Create a new INSERT policy that actually requires authentication
CREATE POLICY "Authenticated users can insert sales data" 
ON public.sales_realized 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);