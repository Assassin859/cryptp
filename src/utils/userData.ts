import { supabase } from './supabaseClient';
import { SimulatedDeployment } from '../types';
import { CompilationResult } from '../utils/hardhatCompiler';
import { SecurityReport } from './securityScanner';
import type { HeatmapQuality } from './traceMapper';

export type DeploymentKind = 'deploy' | 'execute' | 'promoted';

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
  code: string;
  template: string;
  type: string;
  active_file_id?: string;
  github_repo?: string;
  github_branch?: string;
  last_sync_hash?: string;
  compiler_version?: string;
  created_at: string;
  updated_at: string;
  files?: ContractFile[];
}

export interface Compilation {
  id: string;
  user_id: string;
  project_id?: string;
  file_id?: string;
  content_hash?: string;
  security_report?: SecurityReport | null;
  result: CompilationResult;
  compiled_at: string;
}

export interface Deployment {
  id: string;
  user_id: string;
  project_id?: string;
  file_id?: string;
  compilation_id?: string;
  simulated_chain?: SimulatedDeployment;
  network: string;
  tx_hash?: string;
  contract_address?: string;
  status: string;
  gas_used?: number;
  deployer?: string;
  abi?: unknown[];
  bytecode?: string;
  constructor_args?: unknown[];
  call_data?: string;
  call_value_wei?: string;
  gas_limit?: number;
  deployment_kind?: DeploymentKind;
  timestamp: string;
}

export interface GasProfile {
  id: string;
  user_id: string;
  project_id: string;
  file_id: string;
  deployment_id?: string;
  gas_used: number;
  contract_size: number;
  security_score?: number;
  tx_hash?: string;
  quality?: HeatmapQuality;
  unmapped_gas?: number;
  line_gas_map?: Record<string, number>;
  created_at: string;
}

export interface SaveCompilationOptions {
  fileId?: string;
  contentHash?: string;
  securityReport?: SecurityReport | null;
}

/** SHA-256 hex digest of file content for staleness checks. */
export async function computeContentHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stripEphemeralCompilationFields(result: CompilationResult): CompilationResult {
  const { simulation: _sim, ...rest } = result;
  return rest;
}

// Projects CRUD
export const createProject = async (
  userId: string,
  project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
) => {
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

export const updateProject = async (
  projectId: string,
  updates: Partial<
    Pick<
      Project,
      | 'name'
      | 'code'
      | 'template'
      | 'type'
      | 'github_repo'
      | 'github_branch'
      | 'last_sync_hash'
      | 'compiler_version'
      | 'active_file_id'
    >
  >
) => {
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
  const files = await getFiles(projectId);
  const fileIds = files.map((f) => f.id);
  if (fileIds.length > 0) {
    await supabase.from('snapshots').delete().in('file_id', fileIds);
  }
  await supabase.from('gas_profiles').delete().eq('project_id', projectId);
  await supabase.from('compilations').delete().eq('project_id', projectId);
  await supabase.from('deployments').delete().eq('project_id', projectId);
  await supabase.from('files').delete().eq('workspace_id', projectId);

  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
};

// Compilations CRUD
export const saveCompilation = async (
  userId: string,
  projectId: string | undefined,
  result: CompilationResult,
  options: SaveCompilationOptions = {}
) => {
  const payload = {
    user_id: userId,
    project_id: projectId,
    file_id: options.fileId ?? null,
    content_hash: options.contentHash ?? null,
    security_report: options.securityReport ?? null,
    result: stripEphemeralCompilationFields(result),
  };

  const { data, error } = await supabase
    .from('compilations')
    .insert([payload])
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

export const getLatestCompilation = async (
  userId: string,
  projectId: string,
  fileId: string
): Promise<Compilation | null> => {
  const { data, error } = await supabase
    .from('compilations')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .eq('file_id', fileId)
    .order('compiled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Compilation | null;
};

// Deployments CRUD
export type SaveDeploymentPayload = Omit<Deployment, 'id' | 'user_id' | 'project_id' | 'timestamp'>;

export const saveDeployment = async (
  userId: string,
  projectId: string | undefined,
  deployment: SaveDeploymentPayload
) => {
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

/** Sandbox replay log: deploy + execute rows in chronological order. */
export const getSandboxReplayLog = async (userId: string, projectId: string): Promise<Deployment[]> => {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .in('deployment_kind', ['deploy', 'execute'])
    .order('timestamp', { ascending: true });

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

// Gas profiles
export interface SaveGasProfilePayload {
  projectId: string;
  fileId: string;
  deploymentId?: string;
  gasUsed: number;
  contractSize: number;
  securityScore?: number;
  txHash?: string;
  quality?: HeatmapQuality;
  unmappedGas?: number;
  lineGasMap?: Map<number, number>;
}

export const saveGasProfile = async (userId: string, payload: SaveGasProfilePayload) => {
  const lineGasObj: Record<string, number> = {};
  payload.lineGasMap?.forEach((gas, line) => {
    lineGasObj[String(line)] = gas;
  });

  const { data, error } = await supabase
    .from('gas_profiles')
    .insert([
      {
        user_id: userId,
        project_id: payload.projectId,
        file_id: payload.fileId,
        deployment_id: payload.deploymentId ?? null,
        gas_used: payload.gasUsed,
        contract_size: payload.contractSize,
        security_score: payload.securityScore ?? 100,
        tx_hash: payload.txHash ?? null,
        quality: payload.quality ?? null,
        unmapped_gas: payload.unmappedGas ?? 0,
        line_gas_map: lineGasObj,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as GasProfile;
};

export const getGasProfileByDeployment = async (
  userId: string,
  deploymentId: string
): Promise<GasProfile | null> => {
  const { data, error } = await supabase
    .from('gas_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('deployment_id', deploymentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as GasProfile | null;
};

export function gasProfileToLineGasMap(profile: GasProfile): Map<number, number> {
  const map = new Map<number, number>();
  const raw = profile.line_gas_map ?? {};
  for (const [line, gas] of Object.entries(raw)) {
    map.set(Number(line), gas);
  }
  return map;
}

// Files CRUD
export const createFile = async (
  userId: string,
  workspaceId: string,
  name: string,
  content: string = ''
) => {
  const { data: existing } = await supabase
    .from('files')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', name)
    .maybeSingle();

  if (existing) {
    throw new Error(`A file or folder with the name "${name}" already exists in this workspace.`);
  }

  const { data, error } = await supabase
    .from('files')
    .insert([{ user_id: userId, workspace_id: workspaceId, name, content }])
    .select()
    .single();

  if (error) throw error;
  return data as ContractFile;
};

export const renameFile = async (fileId: string, newName: string) => {
  const { data, error } = await supabase
    .from('files')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', fileId)
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
  const { error } = await supabase.from('files').delete().eq('id', fileId);
  if (error) throw error;
};

export const migrateWorkspacesToFiles = async (
  userId: string,
  project: Project
): Promise<ContractFile[]> => {
  if (project.code && project.code.trim() !== '') {
    const files = await getFiles(project.id);
    if (files.length === 0) {
      const fileName = `${project.template || 'main'}.sol`;
      const newFile = await createFile(userId, project.id, fileName, project.code);

      await updateProject(project.id, { code: '' });
      await supabase.from('projects').update({ active_file_id: newFile.id }).eq('id', project.id);

      return [newFile];
    }
    return files;
  }
  return await getFiles(project.id);
};

export const migrateLocalStorageToSupabase = async (userId: string) => {
  try {
    const existingProjects = await getProjects(userId);
    if (existingProjects.length > 0) {
      console.log('User already has projects in Supabase, skipping migration');
      return;
    }

    const code = localStorage.getItem(`cryptp-${userId}-code`);
    const selectedTemplate = localStorage.getItem(`cryptp-${userId}-selectedTemplate`);
    const compileResultStr = localStorage.getItem(`cryptp-${userId}-compileResult`);
    const simulationsStr = localStorage.getItem(`cryptp-${userId}-simulations`);

    if (code) {
      const project = await createProject(userId, {
        name: 'My Project',
        code,
        template: selectedTemplate || 'basic',
        type: 'ERC20',
      });

      if (compileResultStr) {
        try {
          const compileResult = JSON.parse(compileResultStr) as CompilationResult;
          await saveCompilation(userId, project.id, compileResult);
        } catch (e) {
          console.warn('Failed to migrate compile result:', e);
        }
      }

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
              deployer: sim.deployer,
              deployment_kind: sim.isRealChain ? 'promoted' : 'deploy',
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

/** Map DB deployment row to UI SimulatedDeployment. */
export function deploymentToSimulation(
  d: Deployment,
  addressOverride?: string
): SimulatedDeployment {
  const chain = d.simulated_chain;
  return {
    network: d.network,
    transactionHash: d.tx_hash || '',
    contractAddress: addressOverride ?? d.contract_address ?? '',
    status: (d.status as SimulatedDeployment['status']) || 'confirmed',
    gasUsed: d.gas_used || 0,
    deployer: d.deployer || '',
    timestamp: d.timestamp,
    blockNumber: chain?.blockNumber ?? 0,
    isRealChain: chain?.isRealChain ?? d.deployment_kind === 'promoted',
    abi: (d.abi as SimulatedDeployment['abi']) ?? chain?.abi,
  };
}
