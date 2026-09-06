import "dotenv/config";
import { network } from "hardhat";

const { ethers } = await network.connect({ network: "sepolia" });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`);
  }
  return body.data as T;
}

async function main() {
  const registryAddr = process.env.VITE_GRAPH_REGISTRY_ADDRESS;
  const endpoint = process.env.VITE_GRAPH_ENDPOINT;
  if (!registryAddr || !endpoint) throw new Error("Missing VITE_GRAPH_*");

  const [signer] = await ethers.getSigners();
  console.log("signer", await signer.getAddress());

  const Storage = await ethers.getContractFactory("SimpleStorage");
  const storage = await Storage.deploy();
  await storage.waitForDeployment();
  const storageAddr = await storage.getAddress();
  console.log("SimpleStorage", storageAddr);

  const registry = await ethers.getContractAt("CryptPIndexRegistry", registryAddr);
  const kind = await registry.KIND_SIMPLE_STORAGE();
  const regTx = await registry.register(storageAddr, kind);
  console.log("register tx", regTx.hash);
  await regTx.wait();

  const setTx = await storage.setValue(777n);
  console.log("setValue tx", setTx.hash);
  await setTx.wait();
  console.log("getValue", (await storage.getValue()).toString());

  const idAddr = storageAddr.toLowerCase();
  let indexed = false;
  let events: { newValue: string; transactionHash: string }[] = [];

  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const meta = await gql<{ _meta: { block: { number: number } } }>(
      endpoint,
      `{ _meta { block { number } } }`
    );
    const data = await gql<{
      indexedContract: { id: string } | null;
      valueChangeds: { newValue: string; transactionHash: string }[];
    }>(
      endpoint,
      `query ($id: ID!, $c: Bytes!) {
        indexedContract(id: $id) { id }
        valueChangeds(first: 5, orderBy: blockTimestamp, orderDirection: desc, where: { contract: $c }) {
          newValue transactionHash
        }
      }`,
      { id: idAddr, c: idAddr }
    );
    indexed = Boolean(data.indexedContract);
    events = data.valueChangeds;
    console.log(
      `poll ${i + 1}: graphBlock=${meta._meta.block.number} indexed=${indexed} events=${events.length}`
    );
    if (indexed && events.length > 0) break;
  }

  if (!indexed || events.length === 0) {
    console.error("FAIL", { indexed, events });
    process.exit(1);
  }
  console.log("PASS", { storageAddr, events });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
