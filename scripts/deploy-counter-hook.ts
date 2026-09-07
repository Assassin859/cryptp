import { network } from "hardhat";

const { ethers } = await network.connect();

/** Official Uniswap v4 PoolManager on Ethereum Sepolia */
const DEFAULT_SEPOLIA_POOL_MANAGER = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

async function main() {
  console.log("Deploying CounterHook (educational v4-style hook)...");

  const poolManager = process.env.UNISWAP_V4_POOL_MANAGER || DEFAULT_SEPOLIA_POOL_MANAGER;
  const [deployer] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("CounterHook");
  const hook = await Factory.deploy(poolManager);
  await hook.waitForDeployment();

  const address = await hook.getAddress();
  const flags = await hook.requiredHookFlags();

  console.log("CounterHook deployed to:", address);
  console.log("poolManager:", poolManager);
  console.log("requiredHookFlags (hex):", flags.toString(16));
  console.log("deployer:", deployer.address);
  console.log(
    "\nNote: Live PoolManager only calls hooks whose CREATE2 address encodes permission flags."
  );
  console.log("This Continuity deploy proves IDE → compile → Sepolia bytecode; use CREATE2 for pool attach.");
  console.log("\nSet optional env:");
  console.log(`VITE_UNISWAP_COUNTER_HOOK=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
