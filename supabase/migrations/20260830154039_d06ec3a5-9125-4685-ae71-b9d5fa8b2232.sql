CREATE TABLE public.gear_catalog_edits (
  key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('custom','hidden')),
  cat text NOT NULL,
  "group" text,
  name text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gear_catalog_edits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_catalog_edits TO authenticated;
GRANT ALL ON public.gear_catalog_edits TO service_role;

ALTER TABLE public.gear_catalog_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read catalog edits" ON public.gear_catalog_edits
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert catalog edits" ON public.gear_catalog_edits
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update catalog edits" ON public.gear_catalog_edits
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete catalog edits" ON public.gear_catalog_edits
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));