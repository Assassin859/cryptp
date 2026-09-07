/**
 * Uniswap v4 Continuity constants (Sepolia).
 * @see https://developers.uniswap.org/docs/protocols/v4/deployments
 */

/** Official Uniswap v4 PoolManager on Ethereum Sepolia */
export const SEPOLIA_V4_POOL_MANAGER =
  '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543' as const;

/** Educational CounterHook deployed for Continuity (CREATE2 flags not mined). */
export const SEPOLIA_COUNTER_HOOK =
  '0x99d2Cfa4aD9ba4302D263dfEd6E3372EE4940E9e' as const;

export function getCounterHookAddress(): string {
  return (
    (import.meta.env.VITE_UNISWAP_COUNTER_HOOK as string | undefined)?.trim() ||
    SEPOLIA_COUNTER_HOOK
  );
}
