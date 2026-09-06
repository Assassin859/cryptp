import { ValueChanged as ValueChangedEvent } from "../generated/templates/SimpleStorage/SimpleStorage";
import { ValueChanged } from "../generated/schema";

export function handleValueChanged(event: ValueChangedEvent): void {
  const id = event.transaction.hash.concatI32(event.logIndex.toI32());
  const entity = new ValueChanged(id);
  entity.contract = event.address;
  entity.setter = event.params.setter;
  entity.newValue = event.params.newValue;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
