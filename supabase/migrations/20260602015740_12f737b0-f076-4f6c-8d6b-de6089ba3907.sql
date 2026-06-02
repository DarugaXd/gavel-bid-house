-- ============ FIX 1: lock properties writes to admins only ============
DROP POLICY IF EXISTS "Authenticated can update properties" ON public.properties;

CREATE POLICY "Admins update properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Existing "Admins insert properties" + "Admins delete properties" policies already
-- restrict INSERT/DELETE to admins via has_role(). No additional grant changes needed.

-- ============ FIX 2: protect user_roles from privilege escalation ============
-- Admin roles must be assigned manually by the system owner via the Supabase SQL editor.
-- Authenticated users can only READ their own role (existing "Users view own roles" policy).
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT ALL ON public.user_roles TO service_role;

-- ============ FIX 3: hide whitelist from non-admins via dedicated table ============
CREATE TABLE public.auction_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  ic_number TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, ic_number)
);

GRANT SELECT, INSERT, DELETE ON public.auction_whitelist TO authenticated;
GRANT ALL ON public.auction_whitelist TO service_role;

ALTER TABLE public.auction_whitelist ENABLE ROW LEVEL SECURITY;

-- Migrate existing data from properties.whitelist_ics[] array
INSERT INTO public.auction_whitelist (property_id, ic_number)
SELECT p.id, ic
FROM public.properties p, unnest(p.whitelist_ics) AS ic
WHERE p.whitelist_ics IS NOT NULL AND array_length(p.whitelist_ics, 1) > 0
ON CONFLICT DO NOTHING;

CREATE POLICY "Admins view all whitelist"
  ON public.auction_whitelist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own whitelist entries"
  ON public.auction_whitelist FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.ic_number = auction_whitelist.ic_number
    )
  );

CREATE POLICY "Admins insert whitelist"
  ON public.auction_whitelist FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete whitelist"
  ON public.auction_whitelist FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_auction_whitelist_property ON public.auction_whitelist(property_id);
CREATE INDEX idx_auction_whitelist_ic ON public.auction_whitelist(ic_number);

-- ============ FIX 4 + FIX 5 (rate-limit): secure server-side bid placement ============
CREATE OR REPLACE FUNCTION public.place_bid(p_property_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property properties%ROWTYPE;
  v_new_amount NUMERIC(14,2);
  v_new_ends TIMESTAMPTZ;
  v_user_id UUID := auth.uid();
  v_recent INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the property row to prevent race conditions
  SELECT * INTO v_property FROM properties WHERE id = p_property_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Property not found');
  END IF;

  IF v_property.status <> 'live' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not live');
  END IF;
  IF v_property.is_paused THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is paused');
  END IF;
  IF v_property.current_bidder = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already the highest bidder');
  END IF;

  -- Per-user rate limit: max one bid per 5s per property
  SELECT COUNT(*) INTO v_recent FROM bids
    WHERE property_id = p_property_id
      AND bidder_id = v_user_id
      AND created_at > NOW() - INTERVAL '5 seconds';
  IF v_recent > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please wait before placing another bid');
  END IF;

  v_new_amount := COALESCE(v_property.current_bid, v_property.reserve_price) + v_property.bid_increment;
  v_new_ends := NOW() + (v_property.round_seconds || ' seconds')::INTERVAL;

  UPDATE properties SET
    current_bid = v_new_amount,
    current_bidder = v_user_id,
    round_ends_at = v_new_ends,
    is_paused = false,
    paused_remaining_ms = null
  WHERE id = p_property_id;

  INSERT INTO bids (property_id, bidder_id, amount)
  VALUES (p_property_id, v_user_id, v_new_amount);

  RETURN jsonb_build_object('success', true, 'amount', v_new_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bid(UUID) TO authenticated;

-- ============ FIX 5: profiles_public view with masked IC ============
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  id,
  full_name,
  CASE
    WHEN ic_number IS NULL OR length(ic_number) < 4 THEN 'XXXXXXXXXXXX'
    ELSE 'XXXXXXXX' || right(ic_number, 4)
  END AS ic_masked
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;
