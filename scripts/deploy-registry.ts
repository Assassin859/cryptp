import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Deploying CryptPIndexRegistry...");

  const Registry = await ethers.getContractFactory("CryptPIndexRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const kind = await registry.KIND_SIMPLE_STORAGE();

  console.log("CryptPIndexRegistry deployed to:", address);
  console.log("KIND_SIMPLE_STORAGE:", kind);
  console.log("\nSet in .env / Railway:");
  console.log(`VITE_GRAPH_REGISTRY_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
