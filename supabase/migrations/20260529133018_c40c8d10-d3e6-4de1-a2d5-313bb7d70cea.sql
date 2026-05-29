REVOKE EXECUTE ON FUNCTION public.get_my_cfo_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_cfo_name() TO authenticated;
