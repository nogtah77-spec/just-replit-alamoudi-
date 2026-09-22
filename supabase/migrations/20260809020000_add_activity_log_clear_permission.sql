-- Keep the production Supabase schema aligned with lib/db/src/schema.
-- Safe to re-run if the migration was partially applied.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_clear_activity_logs boolean;

ALTER TABLE public.users
  ALTER COLUMN can_clear_activity_logs SET DEFAULT false;

UPDATE public.users
SET can_clear_activity_logs = false
WHERE can_clear_activity_logs IS NULL;

ALTER TABLE public.users
  ALTER COLUMN can_clear_activity_logs SET NOT NULL;