import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Deploying ERC-20 Token...");

  // Get the contract factory
  const MyToken = await ethers.getContractFactory("MyToken");

  // Deploy the contract (no parameters needed for this constructor)
  const myToken = await MyToken.deploy();

  // Wait for deployment to finish
  await myToken.waitForDeployment();

  const address = await myToken.getAddress();
  console.log("MyToken deployed to:", address);

  // Verify deployment by checking total supply
  const totalSupply = await myToken.totalSupply();
  console.log("Total supply:", ethers.formatEther(totalSupply), "MTK");

  // Check token details
  const name = await myToken.name();
  const symbol = await myToken.symbol();
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });