import { supabase } from './supabaseClient';
import { SimulatedDeployment } from '../types';
import { CompilationResult } from '../utils/hardhatCompiler';



export interface ContractFile {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  code: string; // Legacy field, we now use files table
  template: string;
  type: string;
  active_file_id?: string;
  github_repo?: string;
  github_branch?: string;
  last_sync_hash?: string;
  created_at: string;
  updated_at: string;
  files?: ContractFile[];
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
  abi?: any[];
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

export const updateProject = async (projectId: string, updates: Partial<Pick<Project, 'name' | 'code' | 'template' | 'type' | 'github_repo' | 'github_branch' | 'last_sync_hash'>>) => {
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
  // 1. Manually delete children first for robustness (backup for missing CASCADE)
  await supabase.from('compilations').delete().eq('project_id', projectId);
  await supabase.from('deployments').delete().eq('project_id', projectId);

  // 2. Delete project itself
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

// Files CRUD
export const createFile = async (userId: string, workspaceId: string, name: string, content: string = '') => {

  const { data, error } = await supabase
    .from('files')
    .insert([{ user_id: userId, workspace_id: workspaceId, name, content }])
    .select()
    .single();

  if (error) throw error;
  return data as ContractFile;
};

export const getFiles = async (workspaceId: string): Promise<ContractFile[]> => {

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const updateFile = async (fileId: string, content: string) => {

  const { data, error } = await supabase
    .from('files')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', fileId)
    .select()
    .single();

  if (error) throw error;
  return data as ContractFile;
};

export const deleteFile = async (fileId: string) => {

  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
};

// Migration helper for legacy code -> files
export const migrateWorkspacesToFiles = async (userId: string, project: Project): Promise<ContractFile[]> => {
  if (project.code && project.code.trim() !== '') {
    // Check if files already exist
    const files = await getFiles(project.id);
    if (files.length === 0) {
      const fileName = `${project.template || 'main'}.sol`;
      const newFile = await createFile(userId, project.id, fileName, project.code);
      
      // Update workspace to clear legacy code and set active file
      await updateProject(project.id, { code: '' } as any);
      await supabase.from('projects').update({ active_file_id: newFile.id }).eq('id', project.id);
      
      return [newFile];
    }
    return files;
  }
  return await getFiles(project.id);
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
        template: selectedTemplate || 'basic',
        type: 'ERC20'
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