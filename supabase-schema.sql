-- Copy and paste this SQL into Supabase SQL Editor

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  code TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create compilations table
CREATE TABLE public.compilations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  compiled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create deployments table
CREATE TABLE public.deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  simulated_chain JSONB,
  network TEXT NOT NULL,
  tx_hash TEXT,
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  gas_used BIGINT,
  deployer TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compilations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for compilations
CREATE POLICY "Users can manage own compilations" ON public.compilations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for deployments
CREATE POLICY "Users can manage own deployments" ON public.deployments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to projects
CREATE TRIGGER handle_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_compilations_user_id ON public.compilations(user_id);
CREATE INDEX idx_compilations_project_id ON public.compilations(project_id);
CREATE INDEX idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
