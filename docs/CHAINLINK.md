# Chainlink × Aethon (CRE Confidential Audit Gate)

Aethon uses **Chainlink Runtime Environment (CRE) Confidential Workflows** as a **pre–MetaMask-deploy audit gate**. Proprietary policy and API secrets stay inside a TEE (`handlerInTee`); only `ALLOW` / `DENY` / `MANUAL_REVIEW` leave the enclave.

Supabase remains the app database. The Graph remains Sepolia event history. CRE is **policy**, not indexing.

## User flow (stay in Aethon)

1. Compile your contract (WASM).
2. Open **Problem Audit → Confidential**.
3. Click **Run confidential audit** (calls the trigger proxy; stub mode by default).
4. On **ALLOW**, deploy with MetaMask (Output → Injected Provider) or **Promote**.
5. On **DENY**, live deploy is blocked. Fix source and re-audit.
6. On **MANUAL_REVIEW**, confirm before promoting.

Sandbox (browser VM) deploy is **not** gated — keep the fast local loop.

## Settings

**Settings → Chainlink CRE**

- Gate live deploy (on/off)
- Stub / staging vs Live CRE
- Trigger URL (default `http://localhost:3001/cre/audit`)
- Workflow ID (after `cre workflow register/deploy`)
- `AuditFirewallConsumer` address on Sepolia

Prefs: `localStorage` key `cryptp-cre-keys` (logout-safe).

## Operator flow

### 1. Staging simulate

See [`cre/README.md`](../cre/README.md) and [`docs/cre-simulate-evidence.md`](cre-simulate-evidence.md).

```bash
npm run cre:test
node cre/evidence/run-demo.mjs
# With CRE CLI:
# cre workflow simulate ./aethon-audit-firewall --project-root ./cre --target=staging-settings
```

### 2. Deploy consumer (onchain Continuity state change)

```bash
npm run compile
npm run deploy:audit-consumer
# Set VITE_CRE_CONSUMER_ADDRESS and cre config evms[0].consumer_address
```

### 3. Trigger proxy

```bash
npm run compiler
# POST /cre/audit  — stub policy by default
# Live: set CRE_WORKFLOW_ID + CRE_TRIGGER_PRIVATE_KEY on the server
```

### 4. When CRE deploy access is ready

```bash
cre account access
cre workflow register ./aethon-audit-firewall --project-root ./cre --target=production-settings
# Put workflow ID in VITE_CRE_WORKFLOW_ID / CRE_WORKFLOW_ID
# authorizedKeys = proxy signer address
```

HTTP trigger: https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/triggering-deployed-workflows

## Env

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_CRE_TRIGGER_URL` | Vite / Railway | Proxy URL |
| `VITE_CRE_WORKFLOW_ID` | Vite | Display / live mode |
| `VITE_CRE_CONSUMER_ADDRESS` | Vite | Sepolia consumer |
| `CRE_TRIGGER_PRIVATE_KEY` | Server only | JWT signer for gateway |
| `CRE_WORKFLOW_ID` | Server only | Live trigger |
| `CRE_GATEWAY_URL` | Server only | CRE gateway |

## Price Feeds (A)

Out of scope for this doc — Continuity Feeds companion ships after CRE gate.
