/**
 * Uniswap v4 Continuity constants (Sepolia).
 * @see https://developers.uniswap.org/docs/protocols/v4/deployments
 */
import { lsGet, lsSet } from './aethonStorage';

/** Official Uniswap v4 PoolManager on Ethereum Sepolia */
export const SEPOLIA_V4_POOL_MANAGER =
  '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as const;

/** Educational CounterHook on Sepolia — CREATE2 address encodes BEFORE_SWAP|AFTER_SWAP (0xc0). */
export const SEPOLIA_COUNTER_HOOK =
  '0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0' as const;

const COUNTER_HOOK_PREF_KEY = 'uniswap-counter-hook';

/** Session / env override for the last IDE-mined CounterHook address. */
export function getCounterHookAddress(): string {
  const fromLs = lsGet(COUNTER_HOOK_PREF_KEY)?.trim();
  if (fromLs && /^0x[0-9a-fA-F]{40}$/.test(fromLs)) return fromLs;
  return (
    (import.meta.env.VITE_UNISWAP_COUNTER_HOOK as string | undefined)?.trim() ||
    SEPOLIA_COUNTER_HOOK
  );
}

export function setCounterHookAddress(address: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return;
  lsSet(COUNTER_HOOK_PREF_KEY, address);
}

export function getSepoliaPoolManager(): string {
  return (
    (import.meta.env.VITE_UNISWAP_V4_POOL_MANAGER as string | undefined)?.trim() ||
    SEPOLIA_V4_POOL_MANAGER
  );
}
