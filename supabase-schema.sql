-- CryptP Supabase schema (full reference + RLS)
-- For incremental upgrades on existing DBs, run supabase-migration-persistence.sql

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Project',
  code text NOT NULL DEFAULT '',
  template text NOT NULL DEFAULT 'basic',
  type text DEFAULT 'ERC20',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  active_file_id uuid,
  github_repo text,
  github_branch text,
  last_sync_hash text,
  folders text[] NOT NULL DEFAULT '{}',
  compiler_version text NOT NULL DEFAULT '0.8.20'
);

-- Files (must exist before projects.active_file_id FK)
CREATE TABLE IF NOT EXISTS public.files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  path text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_active_file_id_fkey;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_active_file_id_fkey
  FOREIGN KEY (active_file_id) REFERENCES public.files(id) ON DELETE SET NULL;

-- Compilations
CREATE TABLE IF NOT EXISTS public.compilations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  content_hash text,
  security_report jsonb,
  result jsonb NOT NULL,
  compiled_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compilations_project_file
  ON public.compilations (project_id, file_id, compiled_at DESC);

-- Deployments
CREATE TABLE IF NOT EXISTS public.deployments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  compilation_id uuid REFERENCES public.compilations(id) ON DELETE SET NULL,
  simulated_chain jsonb,
  network text NOT NULL,
  tx_hash text,
  contract_address text,
  status text NOT NULL DEFAULT 'pending',
  gas_used bigint,
  deployer text,
  abi jsonb,
  bytecode text,
  constructor_args jsonb NOT NULL DEFAULT '[]'::jsonb,
  call_data text,
  call_value_wei text,
  gas_limit bigint,
  deployment_kind text NOT NULL DEFAULT 'deploy'
    CHECK (deployment_kind IN ('deploy', 'execute', 'promoted')),
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployments_project_kind
  ON public.deployments (project_id, deployment_kind, timestamp ASC);

-- Gas profiles
CREATE TABLE IF NOT EXISTS public.gas_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  deployment_id uuid REFERENCES public.deployments(id) ON DELETE CASCADE,
  gas_used integer NOT NULL,
  contract_size integer NOT NULL,
  security_score integer DEFAULT 100,
  risk_distribution jsonb DEFAULT '{}'::jsonb,
  optimization_data jsonb DEFAULT '{}'::jsonb,
  tx_hash text,
  quality text,
  unmapped_gas integer DEFAULT 0,
  line_gas_map jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_keys jsonb DEFAULT '{}'::jsonb,
  rpc_keys jsonb DEFAULT '{}'::jsonb,
  graph_prefs jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Snapshots (optional file history)
CREATE TABLE IF NOT EXISTS public.snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compilations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own files" ON public.files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own compilations" ON public.compilations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own deployments" ON public.deployments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own gas profiles" ON public.gas_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own snapshots" ON public.snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_projects_updated_at ON public.projects;
CREATE TRIGGER handle_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON public.files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_gas_profiles_deployment ON public.gas_profiles(deployment_id);
