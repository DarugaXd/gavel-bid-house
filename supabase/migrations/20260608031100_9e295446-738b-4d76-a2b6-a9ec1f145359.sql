ALTER TABLE public.auction_attendees
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.cleanup_stale_attendees(p_property_id UUID)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.auction_attendees
  WHERE property_id = p_property_id
    AND joined_at < NOW() - INTERVAL '15 minutes';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_attendees(UUID) TO authenticated;