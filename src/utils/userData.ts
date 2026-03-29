import { supabase } from './supabaseClient';
import { SimulatedDeployment } from '../types';
import { CompilationResult } from '../utils/hardhatCompiler';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  code: string;
  template: string;
  created_at: string;
  updated_at: string;
}

export interface Compilation {
  id: string;
  user_id: string;
  project_id?: string;
  result: CompilationResult;
  compiled_at: string;
}

export interface Deployment {
  id: string;
  user_id: string;
  project_id?: string;
  simulated_chain?: any;
  network: string;
  tx_hash?: string;
  contract_address?: string;
  status: string;
  gas_used?: number;
  deployer?: string;
  timestamp: string;
}

// Projects CRUD
export const createProject = async (userId: string, project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id: userId, ...project }])
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const getProjects = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const updateProject = async (projectId: string, updates: Partial<Pick<Project, 'name' | 'code' | 'template'>>) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
};

export const deleteProject = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
};

// Compilations CRUD
export const saveCompilation = async (userId: string, projectId: string | undefined, result: CompilationResult) => {
  const { data, error } = await supabase
    .from('compilations')
    .insert([{ user_id: userId, project_id: projectId, result }])
    .select()
    .single();

  if (error) throw error;
  return data as Compilation;
};

export const getCompilations = async (userId: string, projectId?: string): Promise<Compilation[]> => {
  let query = supabase
    .from('compilations')
    .select('*')
    .eq('user_id', userId)
    .order('compiled_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Deployments CRUD
export const saveDeployment = async (userId: string, projectId: string | undefined, deployment: Omit<Deployment, 'id' | 'user_id' | 'project_id' | 'timestamp'>) => {
  const { data, error } = await supabase
    .from('deployments')
    .insert([{ user_id: userId, project_id: projectId, ...deployment }])
    .select()
    .single();

  if (error) throw error;
  return data as Deployment;
};

export const getDeployments = async (userId: string, projectId?: string): Promise<Deployment[]> => {
  let query = supabase
    .from('deployments')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const deleteDeployments = async (userId: string, projectId: string) => {
  const { error } = await supabase
    .from('deployments')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) throw error;
};

// Migration helpers for localStorage to Supabase
export const migrateLocalStorageToSupabase = async (userId: string) => {
  try {
    // Check if user already has projects
    const existingProjects = await getProjects(userId);
    if (existingProjects.length > 0) {
      console.log('User already has projects in Supabase, skipping migration');
      return;
    }

    // Get localStorage data
    const code = localStorage.getItem(`cryptp-${userId}-code`);
    const selectedTemplate = localStorage.getItem(`cryptp-${userId}-selectedTemplate`);
    const compileResultStr = localStorage.getItem(`cryptp-${userId}-compileResult`);
    const simulationsStr = localStorage.getItem(`cryptp-${userId}-simulations`);

    if (code) {
      // Create default project
      const project = await createProject(userId, {
        name: 'My Project',
        code,
        template: selectedTemplate || 'basic'
      });

      // Save compilation if exists
      if (compileResultStr) {
        try {
          const compileResult = JSON.parse(compileResultStr);
          await saveCompilation(userId, project.id, compileResult);
        } catch (e) {
          console.warn('Failed to migrate compile result:', e);
        }
      }

      // Save deployments if exist
      if (simulationsStr) {
        try {
          const simulations: SimulatedDeployment[] = JSON.parse(simulationsStr);
          for (const sim of simulations) {
            await saveDeployment(userId, project.id, {
              simulated_chain: sim,
              network: sim.network,
              tx_hash: sim.transactionHash,
              contract_address: sim.contractAddress,
              status: sim.status,
              gas_used: sim.gasUsed,
              deployer: sim.deployer
            });
          }
        } catch (e) {
          console.warn('Failed to migrate deployments:', e);
        }
      }

      console.log('Successfully migrated localStorage data to Supabase');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};