CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=off) AS
SELECT
  id,
  full_name,
  CASE
    WHEN ic_number IS NULL OR length(ic_number) < 4 THEN 'XXXXXXXXXXXX'
    ELSE 'XXXXXXXX' || right(ic_number, 4)
  END AS ic_masked
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_ic_number_unique UNIQUE (ic_number);