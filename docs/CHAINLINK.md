# Chainlink × Aethon (CRE Confidential Audit Gate)

Aethon uses a **pre–MetaMask-deploy audit gate** aligned with Chainlink Runtime Environment (CRE) Confidential Workflows.

**Staging (default today):** proprietary policy runs **locally via the audit proxy** (`cre-proxy.mjs` / `POST /cre/audit`). That is **not** a TEE verdict.

**Target (when a CRE workflow is registered):** policy and API secrets run in a TEE (`handlerInTee`); only `ALLOW` / `DENY` / `MANUAL_REVIEW` leave the enclave. Until then, Live mode may return `accepted` (workflow queued) without unlocking deploy.

Supabase remains the app database. The Graph remains Sepolia event history. CRE is **policy**, not indexing.

## User flow (stay in Aethon)

1. Compile your contract (WASM) — editor source must match the compiled content hash.
2. Open **Problem Audit → Confidential**.
3. Click **Run staging / CRE audit** (stub/local policy by default).
4. On gateable **ALLOW**, deploy with MetaMask (Output → Injected Provider) or **Promote**.
5. On **DENY**, live deploy is blocked. Fix source and re-audit.
6. On **MANUAL_REVIEW**, confirm before promoting.
7. On Live **accepted**, deploy stays blocked until a real verdict exists (use Stub for gateable results).

Sandbox (browser VM) deploy is **not** gated — keep the fast local loop.

## Settings

**Settings → Chainlink CRE**

- Gate live deploy (on/off) — **client-side advisory gate**, not a TEE firewall
- Stub / staging vs Live CRE
- Trigger URL (local dev: `localhost:3001/cre/audit`; production: set `VITE_CRE_TRIGGER_URL`)
- Workflow ID (after `cre workflow register/deploy`)
- `AuditFirewallConsumer` address on Sepolia (Confidential → **Record verdict on Sepolia** for staging `recordVerdict`)

Prefs: `localStorage` key `cryptp-cre-keys` (logout-safe); cloud sync via `user_settings.cre_prefs` (run [`supabase-migration-cre-prefs.sql`](../supabase-migration-cre-prefs.sql)). Erase Account clears CRE prefs.

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

**Live on Sepolia:** [`0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0`](https://sepolia.etherscan.io/address/0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0) — see [`cre/DEPLOY.md`](../cre/DEPLOY.md).

Staging settlement: after a gateable stub verdict, Confidential → **Record verdict on Sepolia** calls `recordVerdict` as the wallet that is **owner or authorizedReporter**. Production should use Keystone / DON `writeReport` instead.

### 3. Trigger proxy

```bash
npm run compiler
# POST /cre/audit  — stub/local policy by default (requires sha256(source) === sourceHash)
# CORS: CRE_CORS_ORIGINS (comma list); default localhost Vite origins only
# Auth: set CRE_AUDIT_TOKEN on server + VITE_CRE_AUDIT_TOKEN in the app (optional locally)
# Live: set CRE_WORKFLOW_ID + CRE_TRIGGER_PRIVATE_KEY on the server
# Live success → mode accepted (not a fabricated stub labeled live)
# Live failure → HTTP error (fail closed; no silent stub fallback)
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
| `VITE_CRE_TRIGGER_URL` | Vite / Railway | Proxy URL (required in production builds) |
| `VITE_CRE_AUDIT_TOKEN` | Vite / Railway | Optional; must match server `CRE_AUDIT_TOKEN` |
| `VITE_CRE_WORKFLOW_ID` | Vite | Display / live mode |
| `VITE_CRE_CONSUMER_ADDRESS` | Vite | Sepolia consumer |
| `CRE_TRIGGER_PRIVATE_KEY` | Server only | JWT signer for gateway |
| `CRE_WORKFLOW_ID` | Server only | Live trigger |
| `CRE_GATEWAY_URL` | Server only | CRE gateway |
| `CRE_CORS_ORIGINS` | Server only | Comma-separated allowed browser origins |
| `CRE_AUDIT_TOKEN` | Server only | Optional shared secret for `/cre/audit` |

## Price Feeds (A)

Continuity upgrade: Analytics **Market Cost Projection** prefers Chainlink ETH/USD on Sepolia. CoinGecko is fallback only.

| Item | Value |
|------|--------|
| Feed (Sepolia ETH/USD) | [`0x694AA1769357215DE4FAC081bf1f309aDC325306`](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306) |
| Consumer | [`0x22c9F5385b2F01635e8cA36A8b2E5BeE9b00389b`](https://sepolia.etherscan.io/address/0x22c9F5385b2F01635e8cA36A8b2E5BeE9b00389b) — [`EthUsdConsumer.sol`](../contracts/EthUsdConsumer.sol) `settleLatestPrice()` / stale-safe `getLivePrice()` |
| Deploy | `npm run deploy:eth-usd-consumer` |
| Env | `VITE_ETH_USD_CONSUMER_ADDRESS` (Vite / Railway frontend) |
| IDE | Analytics → Market Cost → **Settle ETH/USD on Sepolia** |

`PriceService` reads live ETH/USD via aggregator `latestRoundData` (through `consumer.feed()` when set) with the same staleness checks as settle. Settling is the Continuity **onchain state change**.

## Live CRE HTTP trigger checklist

1. `node scripts/cre-print-trigger-address.mjs` (or `npm run cre:print-trigger`) — prints the EVM address for `CRE_TRIGGER_PRIVATE_KEY`.
2. Set that address on `http_trigger.authorizedKeys` in [`cre/aethon-audit-firewall/config.staging.json`](../cre/aethon-audit-firewall/config.staging.json) / `config.production.json`.
3. `cre account access` → `cre workflow register ./aethon-audit-firewall ...`
4. Set `CRE_WORKFLOW_ID` / `VITE_CRE_WORKFLOW_ID` on the proxy + frontend.
5. Live mode JWT-triggers IDE `sourceCode`/`sourceHash`; gateway `accepted` is not gateable until verdict polling exists — use Stub for unlockable ALLOW.
