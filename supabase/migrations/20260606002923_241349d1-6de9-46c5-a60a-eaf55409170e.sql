-- Restrict Realtime channel access on auction property topics
-- to whitelisted users / admins when the auction is live.
-- Note: realtime.messages is managed by Supabase; if altering it fails
-- in your environment, this policy must be configured via the Supabase
-- Dashboard (Realtime Authorization) instead.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restrict auction realtime by whitelist" ON realtime.messages;

CREATE POLICY "Restrict auction realtime by whitelist"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    (realtime.topic() NOT LIKE 'property:%')
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE 'property:' || p.id::text = realtime.topic()
      AND (
        p.status <> 'live'
        OR public.has_role(auth.uid(), 'admin')
        OR EXISTS (
          SELECT 1 FROM public.auction_whitelist aw
          JOIN public.profiles pr ON pr.ic_number = aw.ic_number
          WHERE aw.property_id = p.id AND pr.id = auth.uid()
        )
      )
    )
  );