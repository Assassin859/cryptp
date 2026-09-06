import { Bytes, DataSourceTemplate } from "@graphprotocol/graph-ts";
import { ContractRegistered } from "../generated/CryptPIndexRegistry/CryptPIndexRegistry";
import { IndexedContract } from "../generated/schema";

// keccak256("SimpleStorage")
const KIND_SIMPLE_STORAGE = Bytes.fromHexString(
  "0xfc521fcdf73a12018513d49916489748b127acfa2352411f4638a7cc48c81422"
);

export function handleContractRegistered(event: ContractRegistered): void {
  const kind = event.params.kind;
  const contractAddress = event.params.contractAddress;

  const entity = new IndexedContract(contractAddress);
  entity.contractAddress = contractAddress;
  entity.registrant = event.params.registrant;
  entity.kind = kind;
  entity.registeredAt = event.block.timestamp;
  entity.registeredTx = event.transaction.hash;
  entity.blockNumber = event.block.number;
  entity.save();

  if (kind.equals(KIND_SIMPLE_STORAGE)) {
    DataSourceTemplate.create("SimpleStorage", [contractAddress.toHexString()]);
  }
}
