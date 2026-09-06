-- Graph Studio / platform prefs on user_settings (not a separate keys table)
-- Safe to re-run.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS graph_prefs jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_settings.graph_prefs IS
  'IDE The Graph prefs: { mode: platform|studio, endpoint, registry }. Not on-chain event data.';
