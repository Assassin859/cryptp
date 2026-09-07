-- CRE Confidential audit gate prefs on user_settings
-- Safe to re-run.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS cre_prefs jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_settings.cre_prefs IS
  'IDE Chainlink CRE prefs: { gateEnabled, mode: stub|live, triggerUrl, workflowId, consumerAddress }. Local key cryptp-cre-keys.';
