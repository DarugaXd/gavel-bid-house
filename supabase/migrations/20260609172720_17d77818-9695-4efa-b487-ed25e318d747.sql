CREATE OR REPLACE FUNCTION public.place_bid(p_property_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_property properties%ROWTYPE;
  v_new_amount NUMERIC(14,2);
  v_new_ends TIMESTAMPTZ;
  v_user_id UUID := auth.uid();
  v_recent INT;
  v_on_whitelist BOOLEAN;
  v_user_ic TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

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

  IF v_property.auction_ends_at IS NOT NULL AND NOW() >= v_property.auction_ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction time has expired');
  END IF;

  SELECT ic_number INTO v_user_ic FROM profiles WHERE id = v_user_id;

  SELECT EXISTS (
    SELECT 1 FROM auction_whitelist
    WHERE property_id = p_property_id
      AND ic_number = v_user_ic
  ) INTO v_on_whitelist;

  IF NOT v_on_whitelist THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not registered for this auction');
  END IF;

  IF v_property.current_bidder = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already the highest bidder');
  END IF;

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
$function$;