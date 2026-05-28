
-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  ic_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
-- Allow viewing winner name publicly (e.g., for live auction)
CREATE POLICY "Authenticated can view names" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Property categories
CREATE TYPE public.property_category AS ENUM ('Terrace','Apartment','Condominium','Bungalow','Semi-Detached','Shop-Lot','Land');

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.property_category NOT NULL,
  reserve_price NUMERIC(14,2) NOT NULL,
  bid_increment NUMERIC(14,2) NOT NULL DEFAULT 10000,
  current_bid NUMERIC(14,2),
  current_bidder UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title_number TEXT NOT NULL,
  tenure TEXT NOT NULL,
  address TEXT NOT NULL,
  conditions TEXT NOT NULL,
  auction_date TIMESTAMPTZ NOT NULL,
  auction_location TEXT NOT NULL,
  image_url TEXT NOT NULL,
  round_ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | live | closed
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT UPDATE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties are public" ON public.properties FOR SELECT TO anon, authenticated USING (true);
-- updates handled via server fn (service role); no direct update policy for users

-- Bids
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bids TO anon, authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bids are public" ON public.bids FOR SELECT TO anon, authenticated USING (true);

-- Auction attendees
CREATE TABLE public.auction_attendees (
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.auction_attendees TO authenticated;
GRANT SELECT ON public.auction_attendees TO anon;
GRANT ALL ON public.auction_attendees TO service_role;
ALTER TABLE public.auction_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendees public read" ON public.auction_attendees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "User joins self" ON public.auction_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User leaves self" ON public.auction_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, ic_number, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'ic_number',''),
    NEW.email
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_attendees;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
ALTER TABLE public.auction_attendees REPLICA IDENTITY FULL;
