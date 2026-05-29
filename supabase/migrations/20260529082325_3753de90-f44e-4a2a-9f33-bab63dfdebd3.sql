
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS proclamation_pdf_url text,
  ADD COLUMN IF NOT EXISTS condition_pdf_url text,
  ADD COLUMN IF NOT EXISTS whitelist_ics text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.properties
  ALTER COLUMN round_seconds SET DEFAULT 40;

-- Storage bucket for property photos, PDFs, and site assets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-assets', 'property-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read of bucket objects
DROP POLICY IF EXISTS "Property assets public read" ON storage.objects;
CREATE POLICY "Property assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-assets');

-- Admins can write to the bucket
DROP POLICY IF EXISTS "Admins write property assets" ON storage.objects;
CREATE POLICY "Admins write property assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update property assets" ON storage.objects;
CREATE POLICY "Admins update property assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete property assets" ON storage.objects;
CREATE POLICY "Admins delete property assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-assets' AND public.has_role(auth.uid(), 'admin'));
