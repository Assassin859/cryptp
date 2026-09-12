/**
 * Re-export browser/Hardhat shared HookMiner for deploy scripts.
 */
export {
  CREATE2_DEPLOYER,
  ALL_HOOK_MASK,
  BEFORE_SWAP_FLAG,
  AFTER_SWAP_FLAG,
  COUNTER_HOOK_FLAGS,
  addressMatchesFlags,
  mineHookSalt,
  create2DeployCalldata,
  hashInitCode,
} from '../src/utils/hookMiner.ts';
