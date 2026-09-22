-- Keep the production Supabase schema aligned with lib/db/src/schema.
-- These statements are safe to re-run if the migration was partially applied.

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS hero_image text;

ALTER TABLE public.regions
  ALTER COLUMN hero_image SET DEFAULT '';

-- Move images written by the temporary compatibility layer into the
-- canonical column before enforcing NOT NULL.
UPDATE public.regions AS regions
SET hero_image = NULLIF(settings.data->'regionHeroImages'->>regions.id, '')
FROM public.settings AS settings
WHERE settings.id = 'main'
  AND COALESCE(regions.hero_image, '') = ''
  AND NULLIF(settings.data->'regionHeroImages'->>regions.id, '') IS NOT NULL;

UPDATE public.regions
SET hero_image = ''
WHERE hero_image IS NULL;

ALTER TABLE public.regions
  ALTER COLUMN hero_image SET NOT NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS parking text;

ALTER TABLE public.properties
  ALTER COLUMN parking SET DEFAULT '';

UPDATE public.properties
SET parking = ''
WHERE parking IS NULL;

ALTER TABLE public.properties
  ALTER COLUMN parking SET NOT NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS additional_features text;

ALTER TABLE public.properties
  ALTER COLUMN additional_features SET DEFAULT '';

UPDATE public.properties
SET additional_features = ''
WHERE additional_features IS NULL;

ALTER TABLE public.properties
  ALTER COLUMN additional_features SET NOT NULL;