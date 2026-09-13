import { Bytes, DataSourceTemplate } from "@graphprotocol/graph-ts";
import { ContractRegistered } from "../generated/CryptPIndexRegistry/CryptPIndexRegistry";
import { IndexedContract } from "../generated/schema";

// keccak256("SimpleStorage") — ethers.id
const KIND_SIMPLE_STORAGE = Bytes.fromHexString(
  "0xfc521fcdf73a12018513d49916489748b127acfa2352411f4638a7cc48c81422"
);
// keccak256("CounterHook")
const KIND_COUNTER_HOOK = Bytes.fromHexString(
  "0x6fc4ad35dc6d1fbc80143891c0f8e608e44304d4f6059dcb7092e7c7ab88fd89"
);
// keccak256("AuditFirewallConsumer")
const KIND_AUDIT_FIREWALL = Bytes.fromHexString(
  "0xd34946674c180dc874e1ec2f3521324d5cb0f6d0b03c05899293591761c7ac9d"
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

  // Event templates per Continuity kind.
  if (kind.equals(KIND_SIMPLE_STORAGE)) {
    DataSourceTemplate.create("SimpleStorage", [contractAddress.toHexString()]);
  }
  if (kind.equals(KIND_COUNTER_HOOK)) {
    DataSourceTemplate.create("CounterHook", [contractAddress.toHexString()]);
  }
  if (kind.equals(KIND_AUDIT_FIREWALL)) {
    DataSourceTemplate.create("AuditFirewallConsumer", [contractAddress.toHexString()]);
  }
}
