
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PROFILES: IC tightening + trigger update ============
-- Enforce 12-digit numeric IC + uniqueness
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ic_12_digits CHECK (ic_number ~ '^[0-9]{12}$');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ic_unique UNIQUE (ic_number);

-- Update trigger: read real email from raw_user_meta_data; auth email is synthetic ({ic}@bidders.auction.local)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, ic_number, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'ic_number',''),
    COALESCE(NEW.raw_user_meta_data->>'contact_email', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PROPERTIES: admin write + pause columns ============
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_remaining_ms INTEGER;

GRANT INSERT, DELETE ON public.properties TO authenticated;

CREATE POLICY "Admins insert properties"
ON public.properties FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete properties"
ON public.properties FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ CONTACTS (Section D footer) ============
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contacts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contacts public read"
ON public.contacts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage contacts"
ON public.contacts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.contacts (position, name, title, phone, email, address) VALUES
(1, 'Datuk Ahmad Razali', 'Head Auctioneer', '+60 3-2148 1234', 'ahmad.razali@propertyauctionhouse.my', 'Suite 22-01, Menara KLCC, Jalan Ampang, 50450 Kuala Lumpur'),
(2, 'Ms. Sarah Lim', 'Director, Bidder Relations', '+60 3-2148 5678', 'sarah.lim@propertyauctionhouse.my', 'Level 18, Menara Maxis, Jalan Ampang, 50088 Kuala Lumpur');
