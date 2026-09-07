import { network } from "hardhat";

const { ethers } = await network.connect();

/** Official Chainlink ETH/USD proxy on Ethereum Sepolia */
const DEFAULT_SEPOLIA_ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

async function main() {
  console.log("Deploying EthUsdConsumer...");

  const feed = process.env.ETH_USD_FEED || DEFAULT_SEPOLIA_ETH_USD_FEED;
  const [deployer] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("EthUsdConsumer");
  const consumer = await Factory.deploy(feed);
  await consumer.waitForDeployment();

  const address = await consumer.getAddress();
  console.log("EthUsdConsumer deployed to:", address);
  console.log("feed:", feed);
  console.log("deployer:", deployer.address);
  console.log("\nSet in .env / Railway frontend:");
  console.log(`VITE_ETH_USD_CONSUMER_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
