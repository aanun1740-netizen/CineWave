-- Additive production change; does not rewrite or alter existing film details.
ALTER TABLE public.kinolab_external_catalog
  ADD COLUMN IF NOT EXISTS playback_mode text NOT NULL DEFAULT 'external';

-- Explicit allowlist so a misspelled mode cannot alter navigation behavior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.kinolab_external_catalog'::regclass
      AND conname = 'kinolab_external_catalog_playback_mode_check'
  ) THEN
    ALTER TABLE public.kinolab_external_catalog
      ADD CONSTRAINT kinolab_external_catalog_playback_mode_check
      CHECK (playback_mode IN ('external', 'clean'));
  END IF;
END
$$;
