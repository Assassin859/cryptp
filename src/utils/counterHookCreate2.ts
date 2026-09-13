/**
 * Shared Uniswap Continuity CounterHook CREATE2 deploy (Output + Promote).
 */
import {
  Contract,
  Interface,
  type InterfaceAbi,
  type Provider,
  type Signer,
  concat,
} from 'ethers';
import {
  COUNTER_HOOK_FLAGS,
  CREATE2_DEPLOYER,
  addressMatchesFlags,
  create2DeployCalldata,
  hashInitCode,
  mineHookSalt,
} from './hookMiner';
import { setCounterHookAddress } from './uniswapConstants';
import { SEPOLIA_CHAIN_ID } from './ethUsdConstants';

export type CounterHookCreate2Result = {
  address: string;
  deployTxHash: string;
  bumpTxHash: string;
  blockNumber: number;
  gasUsed: number;
  afterSwapCount: string;
  deployer: string;
};

export async function deployCounterHookCreate2(opts: {
  signer: Signer;
  provider: Provider;
  abi: InterfaceAbi;
  bytecode: string;
  constructorArgs?: unknown[];
  onProgress?: (msg: string) => void;
  /** When true (default), call sandboxBumpAfterSwap after deploy. */
  bumpAfterSwap?: boolean;
}): Promise<CounterHookCreate2Result> {
  const net = await opts.provider.getNetwork();
  if (Number(net.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Wrong network: chain ${Number(net.chainId)}. Switch to Sepolia (${SEPOLIA_CHAIN_ID}) before CREATE2 deploy.`
    );
  }

  const deployerAddress = await opts.signer.getAddress();
  const processedArgs = opts.constructorArgs ?? [];
  const iface = new Interface(opts.abi);
  const encodedArgs = iface.encodeDeploy(processedArgs);
  const bytecode = opts.bytecode.startsWith('0x') ? opts.bytecode : `0x${opts.bytecode}`;
  const initCode = concat([bytecode, encodedArgs]);
  const initCodeHash = hashInitCode(initCode);

  opts.onProgress?.(
    `Mining CREATE2 salt for flag-encoded address (0x${COUNTER_HOOK_FLAGS.toString(16)})…`
  );

  const mined = mineHookSalt({
    initCodeHash,
    flags: COUNTER_HOOK_FLAGS,
    msgSender: deployerAddress,
  });

  if (!addressMatchesFlags(mined.address, COUNTER_HOOK_FLAGS)) {
    throw new Error('Internal error: mined address does not match required hook flags');
  }

  opts.onProgress?.(
    `Mined salt in ${mined.iterations} iterations → ${mined.address} (CREATE2 deployer ${CREATE2_DEPLOYER.slice(0, 10)}…)`
  );

  const codeAt = await opts.provider.getCode(mined.address);
  let deployTxHash = '';

  if (codeAt && codeAt !== '0x') {
    opts.onProgress?.(`Hook already deployed at ${mined.address} — skipping CREATE2 tx.`);
  } else {
    opts.onProgress?.(`Sending CREATE2 deploy tx → ${mined.address}…`);
    const tx = await opts.signer.sendTransaction({
      to: CREATE2_DEPLOYER,
      data: create2DeployCalldata(mined.salt, initCode),
    });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('CREATE2 deploy transaction reverted');
    }
    deployTxHash = receipt.hash;
  }

  const deployedCode = await opts.provider.getCode(mined.address);
  if (!deployedCode || deployedCode === '0x') {
    throw new Error(`CREATE2 failed — no code at ${mined.address}`);
  }

  setCounterHookAddress(mined.address);

  let bumpTxHash = '';
  let blockNumber = 0;
  let gasUsed = 0;
  let afterSwapCount = '0';

  if (opts.bumpAfterSwap !== false) {
    opts.onProgress?.('Calling sandboxBumpAfterSwap() as Continuity proof…');
    const hook = new Contract(mined.address, opts.abi, opts.signer);
    const bumpTx = await hook.sandboxBumpAfterSwap();
    const bumpReceipt = await bumpTx.wait();
    bumpTxHash = bumpReceipt?.hash || '';
    blockNumber = bumpReceipt?.blockNumber || 0;
    gasUsed = bumpReceipt ? Number(bumpReceipt.gasUsed) : 0;
    afterSwapCount = (await hook.afterSwapCount()).toString();
    opts.onProgress?.(
      `sandboxBumpAfterSwap() confirmed (tx ${bumpTxHash.slice(0, 10)}…) — afterSwapCount = ${afterSwapCount}`
    );
  }

  return {
    address: mined.address,
    deployTxHash: deployTxHash || bumpTxHash,
    bumpTxHash,
    blockNumber,
    gasUsed,
    afterSwapCount,
    deployer: deployerAddress,
  };
}
