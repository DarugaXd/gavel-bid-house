
-- Section 2: is_auction_open RPC
CREATE OR REPLACE FUNCTION public.is_auction_open(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.auction_whitelist
    WHERE property_id = p_property_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_auction_open(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_auction_open(UUID) FROM anon;

-- Section 3: re-open public browsing of properties (cards only — bids/attendees remain restricted)
DROP POLICY IF EXISTS "Public can read non-live properties" ON public.properties;
DROP POLICY IF EXISTS "Whitelisted users read live properties" ON public.properties;

CREATE POLICY "Properties are publicly browseable"
  ON public.properties FOR SELECT
  TO anon, authenticated
  USING (true);

-- Section 5: 30-minute auto-close column
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;
