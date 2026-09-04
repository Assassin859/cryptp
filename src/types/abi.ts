import type { InterfaceAbi } from 'ethers';

/** JSON ABI fragment used across compile output and contract interaction */
export type AbiFragment = InterfaceAbi[number];

export function isAbiFunction(
  item: unknown
): item is AbiFragment & {
  type: 'function';
  name: string;
  stateMutability?: string;
  constant?: boolean;
  inputs?: { name?: string; type: string }[];
} {
  if (typeof item !== 'object' || item === null) return false;
  const rec = item as Record<string, unknown>;
  return rec.type === 'function' && typeof rec.name === 'string';
}

/** Unique key for overloaded functions: name(type1,type2). */
export function abiFunctionKey(
  func: { name: string; inputs?: { type: string }[] }
): string {
  const types = (func.inputs ?? []).map((i) => i.type).join(',');
  return `${func.name}(${types})`;
}

export function isReadFunction(item: {
  stateMutability?: string;
  constant?: boolean;
}): boolean {
  if (item.stateMutability === 'view' || item.stateMutability === 'pure') return true;
  if (item.constant === true) return true;
  return false;
}

export function asAbiArray(abi: unknown): AbiFragment[] {
  return Array.isArray(abi) ? (abi as AbiFragment[]) : [];
}
