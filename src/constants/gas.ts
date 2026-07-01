export const DEFAULT_GAS_LIMIT = 8_000_000;
export const MIN_GAS_LIMIT = 21_000;
export const MAX_GAS_LIMIT = 30_000_000;

// Functions with complex state operations that carry a fixed overhead above base gas
export const COMPLEX_FUNCTIONS = ['deposit', 'withdraw', 'transfer', 'mint', 'burn'] as const;
export const COMPLEX_FUNCTION_OVERHEAD = 20_000;

