ALTER TABLE public.gear_catalog_edits
  ADD COLUMN IF NOT EXISTS info text,
  ADD COLUMN IF NOT EXISTS whole_set_spec text,
  ADD COLUMN IF NOT EXISTS parent text;