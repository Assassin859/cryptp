import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Deploying AuditFirewallConsumer...");

  const [deployer] = await ethers.getSigners();
  const reporter = process.env.CRE_VERDICT_REPORTER || deployer.address;

  const Factory = await ethers.getContractFactory("AuditFirewallConsumer");
  const consumer = await Factory.deploy(reporter);
  await consumer.waitForDeployment();

  const address = await consumer.getAddress();
  console.log("AuditFirewallConsumer deployed to:", address);
  console.log("authorizedReporter:", reporter);
  console.log("\nSet in .env / Railway / cre config:");
  console.log(`VITE_CRE_CONSUMER_ADDRESS=${address}`);
  console.log(`# cre/aethon-audit-firewall/config.*.json → evms[0].consumer_address`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
