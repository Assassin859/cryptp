# The Graph × CryptP

CryptP uses a **platform-managed** Sepolia subgraph so users index and query contract history **inside the IDE**. **Supabase remains the app database** (workspaces, files, compilations, deployments, gas profiles, settings).

## Database boundary (important)

| Store | Holds |
|-------|--------|
| **Supabase** | Auth, workspaces, source files, compile artifacts, sandbox/live deploy *recipes*, gas heatmaps, AI/RPC keys, **`graph_prefs`** (Studio URL / mode — not events) |
| **The Graph** | Indexed on-chain events (`ValueChanged`, registration) after a contract is registered |

Do **not** add Graph event rows to Supabase. `deployments` rows are for IDE replay/promote only.

**Migration (existing DBs):** run [`supabase-migration-graph-prefs.sql`](../supabase-migration-graph-prefs.sql) in the Supabase SQL editor.

## User flow (stay in CryptP)

1. Compile and deploy **SimpleStorage** to Sepolia (MetaMask).
2. When prompted, choose **Open Indexed** (or open the **Indexed** activity icon).
3. Click **Register for indexing** (one MetaMask tx to `CryptPIndexRegistry`).
4. In **Interaction**, call `setValue`.
5. Back in **Indexed**, click **Refresh** to see `ValueChanged` rows from The Graph.

Default path uses the CryptP platform endpoint (`VITE_GRAPH_*`). No Studio account required for that path.

### Optional: use your own Graph Studio

In **Settings → The Graph** or the **Indexed** panel, choose **My Graph Studio** and paste:

1. Your Studio **GraphQL query URL**
2. (Optional) Your own `CryptPIndexRegistry` address — needed for **Register for indexing**

Prefs are stored in browser `localStorage` as `cryptp-graph-keys` and synced to Supabase `user_settings.graph_prefs` when you save in Settings (survives sign-out; cleared on Erase Account).

## Operator flow (once per environment)

Until this is done, Indexed shows “platform endpoint not set” (users can still use My Graph Studio).

1. Deploy the registry:

```bash
npm run compile
npm run deploy:registry
```

2. Copy the printed address into:
   - `.env` / Railway: `VITE_GRAPH_REGISTRY_ADDRESS`
   - `subgraph/subgraph.yaml` → `dataSources[0].source.address` (+ `startBlock`)
   - Note: yaml ships with placeholder `0x000…0000` until you replace it

3. Publish the subgraph:

```bash
cd subgraph
npm install
npm run codegen
npm run build
# Deploy via Graph Studio / graph CLI
```

4. Set `VITE_GRAPH_ENDPOINT` to the Studio query URL and redeploy the CryptP frontend.

Details: [subgraph/README.md](../subgraph/README.md).

## What is indexed (v1)

- Kind `keccak256("SimpleStorage")` only.
- Event: `ValueChanged(address indexed setter, uint256 newValue)`.

Sandbox / Local Simulation deploys are **not** indexed (The Graph reads the chain, not browserVM).
