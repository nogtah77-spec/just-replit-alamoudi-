-- Store the staff member responsible for the property source.
-- Safe to re-run and preserves all existing property data.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS assigned_staff_id text;

ALTER TABLE public.properties
  ALTER COLUMN assigned_staff_id SET DEFAULT '';

-- Backfill assignments temporarily stored by the legacy-schema compatibility
-- path before removing the marker from the visible notes field.
UPDATE public.properties
SET assigned_staff_id = substring(source_notes FROM '\[assigned_staff_id:([^\]\r\n]+)\]$'),
    source_notes = regexp_replace(source_notes, E'\s*\[assigned_staff_id:[^\]\r\n]+\]\s*$', '')
WHERE COALESCE(assigned_staff_id, '') = ''
  AND source_notes ~ E'\[assigned_staff_id:[^\]\r\n]+\]$';

UPDATE public.properties
SET assigned_staff_id = ''
WHERE assigned_staff_id IS NULL;

ALTER TABLE public.properties
  ALTER COLUMN assigned_staff_id SET NOT NULL;