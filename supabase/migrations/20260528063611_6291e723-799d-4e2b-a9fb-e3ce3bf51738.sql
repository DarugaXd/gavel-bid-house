
CREATE POLICY "Authenticated can update properties" ON public.properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
GRANT INSERT ON public.bids TO authenticated;
CREATE POLICY "Authenticated insert own bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
