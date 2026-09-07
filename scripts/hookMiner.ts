/**
 * Uniswap v4-style hook address miner (CREATE2).
 * Mines a salt so CREATE2(address) encodes the required permission flag bits.
 *
 * Matches Uniswap Hooks.ALL_HOOK_MASK = (1 << 14) - 1 and HookMiner.find semantics.
 */
import { getCreate2Address, keccak256, solidityPackedKeccak256, zeroPadValue } from 'ethers';

/** Arachnid / Foundry CREATE2 Deployer Proxy (most EVM chains including Sepolia). */
export const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

/** Lower 14 bits encode hook permission flags (Uniswap v4 Hooks.sol). */
export const ALL_HOOK_MASK = (1n << 14n) - 1n;

export const BEFORE_SWAP_FLAG = 1n << 7n;
export const AFTER_SWAP_FLAG = 1n << 6n;

export const COUNTER_HOOK_FLAGS = BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG; // 0xc0

export function addressMatchesFlags(address: string, flags: bigint): boolean {
  return (BigInt(address) & ALL_HOOK_MASK) === (flags & ALL_HOOK_MASK);
}

/**
 * Find salt such that getCreate2Address(CREATE2_DEPLOYER, salt, initCodeHash) has `flags`.
 * Prefers salts derived from (msgSender, nonce) for uniqueness across deployers.
 */
export function mineHookSalt(opts: {
  initCodeHash: string;
  flags: bigint;
  /** EOA that will submit the CREATE2 tx (used in salt search space). */
  msgSender: string;
  maxIterations?: number;
}): { salt: string; address: string; iterations: number } {
  const max = opts.maxIterations ?? 200_000;
  for (let i = 0; i < max; i++) {
    const salt = solidityPackedKeccak256(['address', 'uint256'], [opts.msgSender, i]);
    const address = getCreate2Address(CREATE2_DEPLOYER, salt, opts.initCodeHash);
    if (addressMatchesFlags(address, opts.flags)) {
      return { salt, address, iterations: i + 1 };
    }
  }
  throw new Error(
    `HookMiner: no salt found in ${max} iterations for flags 0x${opts.flags.toString(16)}`
  );
}

/** Build CREATE2 deployer calldata: 32-byte salt || initCode */
export function create2DeployCalldata(salt: string, initCode: string): string {
  const saltBytes = zeroPadValue(salt, 32);
  const code = initCode.startsWith('0x') ? initCode.slice(2) : initCode;
  return saltBytes + code;
}

export function hashInitCode(initCode: string): string {
  return keccak256(initCode.startsWith('0x') ? initCode : `0x${initCode}`);
}
