import { VerdictReceived as VerdictReceivedEvent } from "../generated/templates/AuditFirewallConsumer/AuditFirewallConsumer";
import { VerdictReceived } from "../generated/schema";

export function handleVerdictReceived(event: VerdictReceivedEvent): void {
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const entity = new VerdictReceived(id);
  entity.contract = event.address;
  entity.verdictCode = event.params.verdictCode;
  entity.riskMask = event.params.riskMask;
  entity.sourceHash = event.params.sourceHash;
  entity.reporter = event.params.reporter;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
