-- ============================================================
-- CryptP migration: persistence + sandbox rehydration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Projects: persist compiler preference
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS compiler_version text NOT NULL DEFAULT '0.8.20';

-- Fix active_file_id FK so deleting a file doesn't block project delete
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_active_file_id_fkey;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_active_file_id_fkey
  FOREIGN KEY (active_file_id) REFERENCES public.files(id) ON DELETE SET NULL;

-- 2. Compilations: link to file + staleness + security report
ALTER TABLE public.compilations
  ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS security_report jsonb;

CREATE INDEX IF NOT EXISTS idx_compilations_project_file
  ON public.compilations (project_id, file_id, compiled_at DESC);

CREATE INDEX IF NOT EXISTS idx_compilations_content_hash
  ON public.compilations (content_hash);

-- 3. Deployments: enough data to replay sandbox txs
ALTER TABLE public.deployments
  ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compilation_id uuid REFERENCES public.compilations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bytecode text,
  ADD COLUMN IF NOT EXISTS constructor_args jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS call_data text,
  ADD COLUMN IF NOT EXISTS call_value_wei text,
  ADD COLUMN IF NOT EXISTS gas_limit bigint,
  ADD COLUMN IF NOT EXISTS deployment_kind text NOT NULL DEFAULT 'deploy'
    CHECK (deployment_kind IN ('deploy', 'execute', 'promoted'));

CREATE INDEX IF NOT EXISTS idx_deployments_project_kind
  ON public.deployments (project_id, deployment_kind, timestamp ASC);

-- 4. Cascade deletes from projects (if not already present)
ALTER TABLE public.files
  DROP CONSTRAINT IF EXISTS files_workspace_id_fkey;

ALTER TABLE public.files
  ADD CONSTRAINT files_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 5. gas_profiles: link to deployment for profiler restore (table already exists)
ALTER TABLE public.gas_profiles
  ADD COLUMN IF NOT EXISTS deployment_id uuid REFERENCES public.deployments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS quality text,
  ADD COLUMN IF NOT EXISTS unmapped_gas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_gas_map jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_gas_profiles_deployment
  ON public.gas_profiles (deployment_id);

-- 6. RLS for tables that may be missing policies
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Users manage own files'
  ) THEN
    CREATE POLICY "Users manage own files" ON public.files
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users manage own settings'
  ) THEN
    CREATE POLICY "Users manage own settings" ON public.user_settings
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gas_profiles' AND policyname = 'Users manage own gas profiles'
  ) THEN
    CREATE POLICY "Users manage own gas profiles" ON public.gas_profiles
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'snapshots' AND policyname = 'Users manage own snapshots'
  ) THEN
    CREATE POLICY "Users manage own snapshots" ON public.snapshots
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Optional backfill: mark existing sandbox rows as deploy (promoted = isRealChain in JSON)
UPDATE public.deployments d
SET deployment_kind = CASE
  WHEN (d.simulated_chain->>'isRealChain')::boolean IS TRUE THEN 'promoted'
  WHEN d.contract_address IS NOT NULL AND d.bytecode IS NULL THEN 'deploy'
  ELSE COALESCE(d.deployment_kind, 'deploy')
END
WHERE d.deployment_kind = 'deploy';
