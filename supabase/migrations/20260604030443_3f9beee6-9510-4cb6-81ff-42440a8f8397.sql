CREATE TABLE public.property_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, email)
);
GRANT INSERT, SELECT ON public.property_notifications TO authenticated, anon;
GRANT ALL ON public.property_notifications TO service_role;
ALTER TABLE public.property_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register interest" ON public.property_notifications FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Admins view all notifications" ON public.property_notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));