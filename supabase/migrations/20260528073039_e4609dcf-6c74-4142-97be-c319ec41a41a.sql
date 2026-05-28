
-- 1. Site settings (key/value)
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

-- Seed defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_eyebrow', 'Live Property Auctions'),
  ('hero_title', 'Where prestigious properties meet decisive bidders.'),
  ('hero_description', 'Property Auction House curates Malaysia''s most coveted real estate — from heritage bungalows in Damansara Heights to high-rise residences in KLCC — and brings them under the gavel in transparent, real-time auctions.'),
  ('hero_cta_primary', 'Browse Properties'),
  ('hero_cta_secondary', 'View Live Auctions'),
  ('directory_eyebrow', 'Property Directory'),
  ('directory_title', 'Find your next lot.'),
  ('live_eyebrow', 'Starting Soon'),
  ('live_title', 'Upcoming live auctions.'),
  ('live_subtitle', 'Bid in real time the moment the gavel drops.'),
  ('contact_eyebrow', 'Contact Us'),
  ('contact_title', 'Speak with our auction specialists.'),
  ('footer_tagline', 'Licensed Auctioneers · Kuala Lumpur'),
  ('footer_copyright', 'Property Auction House Sdn Bhd. All rights reserved.')
ON CONFLICT (key) DO NOTHING;

-- 2. Multi-image and configurable round seconds on properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS round_seconds INTEGER NOT NULL DEFAULT 30;

-- Backfill images[] from existing single image_url
UPDATE public.properties
SET images = ARRAY[image_url]
WHERE (images IS NULL OR array_length(images, 1) IS NULL) AND image_url IS NOT NULL AND image_url <> '';
