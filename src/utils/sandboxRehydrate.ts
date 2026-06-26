import { browserVM, type ReplayEntry } from './browserVM';
import {
  Deployment,
  getDeployments,
  getSandboxReplayLog,
  getGasProfileByDeployment,
  gasProfileToLineGasMap,
  deploymentToSimulation,
} from './userData';
import type { HeatmapQuality } from './traceMapper';
import type { SimulatedDeployment } from '../types';

export interface RehydrateSandboxResult {
  simulations: SimulatedDeployment[];
  addressMap: Map<string, string>;
  profilerData?: {
    lineGasMap: Map<number, number>;
    totalGas: number;
    quality: HeatmapQuality;
    unmappedGas: number;
  };
  errors: string[];
}

function deploymentToReplayEntry(d: Deployment): ReplayEntry {
  return {
    id: d.id,
    deployment_kind: d.deployment_kind ?? 'deploy',
    bytecode: d.bytecode,
    constructor_args: d.constructor_args as unknown[] | undefined,
    abi: d.abi as unknown[] | undefined,
    contract_address: d.contract_address,
    call_data: d.call_data,
    call_value_wei: d.call_value_wei,
    gas_limit: d.gas_limit,
  };
}

/**
 * Reset browserVM and replay sandbox deploy + execute rows from Supabase.
 */
export async function rehydrateSandboxFromDb(
  userId: string,
  projectId: string
): Promise<RehydrateSandboxResult> {
  const replayLog = await getSandboxReplayLog(userId, projectId);
  await browserVM.reset();
  const { addressMap, errors } = await browserVM.rehydrate(replayLog);

  const allDeployments = replayLog.length > 0
    ? await getDeployments(userId, projectId)
    : [];

  const simulations: SimulatedDeployment[] = allDeployments.map((d) => {
    const storedAddr = d.contract_address?.toLowerCase() ?? '';
    const liveAddr = addressMap.get(storedAddr) ?? d.contract_address ?? '';
    return deploymentToSimulation(d, liveAddr);
  });

  let profilerData: RehydrateSandboxResult['profilerData'];
  const executeRows = replayLog.filter((r) => r.deployment_kind === 'execute');
  const lastExecute = executeRows[executeRows.length - 1];
  if (lastExecute) {
    const profile = await getGasProfileByDeployment(userId, lastExecute.id);
    if (profile) {
      profilerData = {
        lineGasMap: gasProfileToLineGasMap(profile),
        totalGas: profile.gas_used,
        quality: (profile.quality as HeatmapQuality) ?? 'accurate',
        unmappedGas: profile.unmapped_gas ?? 0,
      };
    }
  }

  return { simulations, addressMap, profilerData, errors };
}

export function resolveLiveAddress(
  storedAddress: string,
  addressMap: Map<string, string>
): string {
  return addressMap.get(storedAddress.toLowerCase()) ?? storedAddress;
}
