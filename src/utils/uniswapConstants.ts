/**
 * Uniswap v4 Continuity constants (Sepolia).
 * @see https://developers.uniswap.org/docs/protocols/v4/deployments
 */

/** Official Uniswap v4 PoolManager on Ethereum Sepolia */
export const SEPOLIA_V4_POOL_MANAGER =
  '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as const;

/** Educational CounterHook on Sepolia — CREATE2 address encodes BEFORE_SWAP|AFTER_SWAP (0xc0). */
export const SEPOLIA_COUNTER_HOOK =
  '0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0' as const;

export function getCounterHookAddress(): string {
  return (
    (import.meta.env.VITE_UNISWAP_COUNTER_HOOK as string | undefined)?.trim() ||
    SEPOLIA_COUNTER_HOOK
  );
}
