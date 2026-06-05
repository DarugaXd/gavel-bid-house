DROP POLICY IF EXISTS "Properties are public" ON public.properties;

CREATE POLICY "Public can read non-live properties"
  ON public.properties FOR SELECT
  TO anon, authenticated
  USING (status IN ('upcoming', 'closed'));

CREATE POLICY "Whitelisted users read live properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    status = 'live'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.auction_whitelist aw
        JOIN public.profiles p ON p.ic_number = aw.ic_number
        WHERE aw.property_id = properties.id
          AND p.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Bids are public" ON public.bids;

CREATE POLICY "Public can read closed auction bids"
  ON public.bids FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bids.property_id
        AND properties.status = 'closed'
    )
  );

CREATE POLICY "Whitelisted users read live bids"
  ON public.bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bids.property_id
        AND properties.status = 'live'
        AND (
          public.has_role(auth.uid(), 'admin')
          OR EXISTS (
            SELECT 1
            FROM public.auction_whitelist aw
            JOIN public.profiles p ON p.ic_number = aw.ic_number
            WHERE aw.property_id = bids.property_id
              AND p.id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Attendees public read" ON public.auction_attendees;

CREATE POLICY "Room participants read attendees"
  ON public.auction_attendees FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = auction_attendees.user_id
    OR EXISTS (
      SELECT 1
      FROM public.auction_whitelist aw
      JOIN public.profiles p ON p.ic_number = aw.ic_number
      WHERE aw.property_id = auction_attendees.property_id
        AND p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auction_whitelist_property_ic
  ON public.auction_whitelist(property_id, ic_number);

CREATE INDEX IF NOT EXISTS idx_profiles_ic
  ON public.profiles(ic_number);