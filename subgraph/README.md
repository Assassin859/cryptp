# CryptP platform subgraph (Sepolia)

Indexes contracts registered via `CryptPIndexRegistry` using The Graph data-source templates.
End users never deploy this — they stay in the CryptP IDE.

## Operator setup (once)

1. Deploy the registry:

```bash
npx hardhat compile
npx hardhat run scripts/deploy-registry.ts --network sepolia
```

2. Put the address into `subgraph/subgraph.yaml` → `dataSources[0].source.address` and set a sensible `startBlock` (registry deploy block).
   Until then the yaml keeps placeholder `0x000…0000` — Indexed will not see live data for the platform path.

3. Install + codegen + publish:

```bash
cd subgraph
npm install
npm run codegen
npm run build
# Then deploy via Graph Studio / graph deploy
```

4. Set Railway / `.env`:

```
VITE_GRAPH_REGISTRY_ADDRESS=0x...
VITE_GRAPH_ENDPOINT=https://api.studio.thegraph.com/query/<id>/cryptp-sepolia-indexer/version/latest
```

## User flow (in CryptP)

Deploy SimpleStorage on Sepolia → Indexed panel → **Register for indexing** → call `setValue` → **Refresh**.
