/**
 * Deploy CounterHook via CREATE2 so the address encodes BEFORE_SWAP | AFTER_SWAP flags.
 * Uses the standard CREATE2 Deployer Proxy (same as Foundry HookMiner / Uniswap docs).
 *
 *   npm run deploy:counter-hook
 */
import { network } from 'hardhat';
import {
  AFTER_SWAP_FLAG,
  BEFORE_SWAP_FLAG,
  CREATE2_DEPLOYER,
  addressMatchesFlags,
  create2DeployCalldata,
  hashInitCode,
  mineHookSalt,
} from './hookMiner.ts';

const { ethers } = await network.connect();

const DEFAULT_SEPOLIA_POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543';
const FLAGS = BEFORE_SWAP_FLAG | AFTER_SWAP_FLAG;

async function main() {
  console.log('Mining + deploying CounterHook (CREATE2 flag-encoded address)...');

  const poolManager = process.env.UNISWAP_V4_POOL_MANAGER || DEFAULT_SEPOLIA_POOL_MANAGER;
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error('No deployer — set SEPOLIA_PRIVATE_KEY for --network sepolia');
  }

  const Factory = await ethers.getContractFactory('CounterHook');
  const encodedArgs = Factory.interface.encodeDeploy([poolManager]);
  const initCode = ethers.concat([Factory.bytecode, encodedArgs]);
  const initCodeHash = hashInitCode(initCode);

  console.log('poolManager:', poolManager);
  console.log('deployer (tx sender):', deployer.address);
  console.log('flags:', `0x${FLAGS.toString(16)} (BEFORE_SWAP|AFTER_SWAP)`);
  console.log('CREATE2 deployer:', CREATE2_DEPLOYER);

  const mined = mineHookSalt({
    initCodeHash,
    flags: FLAGS,
    msgSender: deployer.address,
  });
  console.log(`Mined salt in ${mined.iterations} iterations`);
  console.log('Predicted hook address:', mined.address);

  if (!addressMatchesFlags(mined.address, FLAGS)) {
    throw new Error('Internal error: mined address does not match flags');
  }

  const codeAt = await ethers.provider.getCode(mined.address);
  if (codeAt && codeAt !== '0x') {
    console.log('Hook already deployed at predicted address (skipping CREATE2).');
  } else {
    const tx = await deployer.sendTransaction({
      to: CREATE2_DEPLOYER,
      data: create2DeployCalldata(mined.salt, initCode),
    });
    console.log('CREATE2 tx:', tx.hash);
    await tx.wait();
  }

  const deployedCode = await ethers.provider.getCode(mined.address);
  if (!deployedCode || deployedCode === '0x') {
    throw new Error(`CREATE2 failed — no code at ${mined.address}`);
  }

  const hook = await ethers.getContractAt('CounterHook', mined.address);
  const onchainFlags = BigInt(await hook.requiredHookFlags());
  const pm = await hook.poolManager();

  if (!addressMatchesFlags(mined.address, onchainFlags)) {
    throw new Error(
      `Address flags mismatch: addr&mask=${(BigInt(mined.address) & 0x3fffn).toString(16)} required=${onchainFlags.toString(16)}`
    );
  }
  if (pm.toLowerCase() !== poolManager.toLowerCase()) {
    throw new Error(`poolManager mismatch: ${pm} vs ${poolManager}`);
  }

  console.log('\nCounterHook (CREATE2) deployed to:', mined.address);
  console.log('Address encodes flags: YES (BEFORE_SWAP + AFTER_SWAP)');
  console.log('requiredHookFlags:', `0x${onchainFlags.toString(16)}`);
  console.log('\nSet optional env:');
  console.log(`VITE_UNISWAP_COUNTER_HOOK=${mined.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
