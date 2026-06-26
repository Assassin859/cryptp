import type { InterfaceAbi } from 'ethers';

/** JSON ABI fragment used across compile output and contract interaction */
export type AbiFragment = InterfaceAbi[number];

export function isAbiFunction(
  item: unknown
): item is AbiFragment & { type: 'function'; name: string; stateMutability?: string; inputs?: { name?: string; type: string }[] } {
  if (typeof item !== 'object' || item === null) return false;
  const rec = item as Record<string, unknown>;
  return rec.type === 'function' && typeof rec.name === 'string';
}

export function asAbiArray(abi: unknown): AbiFragment[] {
  return Array.isArray(abi) ? (abi as AbiFragment[]) : [];
}
