# Aethon platform subgraph (Sepolia)

Indexes contracts registered via `CryptPIndexRegistry` using The Graph data-source templates.
End users never deploy this — they stay in the Aethon IDE.

## What is indexed

| Kind | Entity | Event |
|------|--------|--------|
| SimpleStorage | `ValueChanged` | `ValueChanged(address,uint256)` |
| CounterHook | `HookAfterSwap` | `AfterSwapCounted(address,uint256)` |
| AuditFirewallConsumer | `VerdictReceived` | `VerdictReceived(uint8,uint8,bytes32,uint64,address)` |

All kinds also create an `IndexedContract` row (Continuity verify).

## Operator setup (once / when schema changes)

1. Deploy the registry (if not already):

```bash
npx hardhat compile
npx hardhat run scripts/deploy-registry.ts --network sepolia
```

2. Put the address into `subgraph.yaml` → `dataSources[0].source.address` and set `startBlock`.

3. Install + codegen + build + publish:

```bash
cd subgraph
npm install
npm run codegen
npm run build
# Graph Studio:
npx graph auth --studio <DEPLOY_KEY>
npm run deploy-studio
# or: npx graph deploy --studio cryptp-sepolia-indexer
```

4. Set Railway / `.env`:

```
VITE_GRAPH_REGISTRY_ADDRESS=0x94343B4062d0A021558998463664f4B90bA0a6ab
VITE_GRAPH_ENDPOINT=https://api.studio.thegraph.com/query/<id>/cryptp-sepolia-indexer/version/latest
```

**Important:** After adding CounterHook / AuditFirewall templates, you **must** republish Studio. Until then the IDE still works for `IndexedContract` + `ValueChanged`, and soft-skips missing `verdictReceiveds` / `hookAfterSwaps` fields.

## User flow (in Aethon)

1. Deploy SimpleStorage / CounterHook / AuditFirewall on Sepolia  
2. Auto-register (Settings) or **Indexed → Register**  
3. Wait for IndexedContract  
4. Call `setValue` / `sandboxBumpAfterSwap` / `recordVerdict` → **Refresh**
