/**
 * Register a Sepolia deployment with CryptPIndexRegistry for The Graph.
 */
import { Contract, type Signer } from 'ethers';
import {
  getGraphRegistryAddress,
  REGISTRY_ABI,
  resolveRegisterKind,
} from './graphConstants';
import { getErrorMessage } from './errorMessage';

export async function registerContractForIndexing(opts: {
  signer: Signer;
  contractAddress: string;
  abi: unknown;
}): Promise<{ txHash: string; kind: string; alreadyRegistered?: boolean }> {
  const kind = resolveRegisterKind(opts.abi);
  if (!kind) {
    throw new Error('ABI is not a Continuity-indexable kind (SimpleStorage / CounterHook / AuditFirewall)');
  }
  const registryAddress = getGraphRegistryAddress();
  if (!registryAddress) {
    throw new Error('Graph registry address not configured');
  }
  const registry = new Contract(registryAddress, REGISTRY_ABI, opts.signer);
  try {
    const tx = await registry.register(opts.contractAddress, kind);
    await tx.wait();
    return { txHash: tx.hash as string, kind };
  } catch (e) {
    const msg = getErrorMessage(e) || '';
    if (/AlreadyRegistered|already/i.test(msg)) {
      return { txHash: '', kind, alreadyRegistered: true };
    }
    throw e;
  }
}
