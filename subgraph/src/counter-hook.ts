import { AfterSwapCounted as AfterSwapCountedEvent } from "../generated/templates/CounterHook/CounterHook";
import { HookAfterSwap } from "../generated/schema";

export function handleAfterSwapCounted(event: AfterSwapCountedEvent): void {
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const entity = new HookAfterSwap(id);
  entity.contract = event.address;
  entity.caller = event.params.caller;
  entity.newCount = event.params.newCount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
