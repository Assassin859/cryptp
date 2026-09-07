# CRE deploy checklist (when access is ready)

Staging package and IDE gates ship without live DON access. Complete this when `cre whoami` shows deploy enabled.

## Sepolia consumer (Continuity state change)

Deployed `AuditFirewallConsumer`:

- Address: `0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0`
- Authorized reporter (deployer): `0x70905452aBdE07e6074BD29Fc3C2DFcDdF0B4bF7`
- Etherscan: https://sepolia.etherscan.io/address/0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0

Set `VITE_CRE_CONSUMER_ADDRESS` (local `.env` + Railway). Config `evms[0].consumer_address` is filled in staging/production JSON.

## 1. Auth

```bash
# Install: https://docs.chain.link/cre
cre login
cre whoami
cre account access   # request if Deploy Access: Not enabled
```

## 2. Configure production

Edit `cre/aethon-audit-firewall/config.production.json`:

- `scanner_url` / LLM URLs (or keep mock for Continuity demo)
- `http_trigger.authorizedKeys`: address of `CRE_TRIGGER_PRIVATE_KEY`
- `evms[0].consumer_address`: `0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0` (set after deploy)

```bash
npm run deploy:audit-consumer
```

## 3. Register / deploy workflow

```bash
cd cre
cre workflow register ./aethon-audit-firewall --project-root ./ --target=production-settings
# or: cre workflow deploy ./aethon-audit-firewall ...
```

Copy **Workflow ID** → Railway / `.env`:

```
CRE_WORKFLOW_ID=...
VITE_CRE_WORKFLOW_ID=...
CRE_TRIGGER_PRIVATE_KEY=0x...   # server only
VITE_CRE_CONSUMER_ADDRESS=0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0
```

## 4. Point Aethon at live mode

Settings → Chainlink CRE → **Live CRE** → Save.

Proxy (`npm run compiler`) JWT-triggers the gateway; on accept it returns `mode: accepted` (not gateable) until verdict polling exists. Use **Stub** for gateable ALLOW/DENY.

## 5. Demo path

Compile → Problem Audit → Confidential → ALLOW → MetaMask deploy → optional **Record verdict on Sepolia**.

## Railway checklist

| Variable | Where | Notes |
|----------|--------|-------|
| `VITE_CRE_TRIGGER_URL` | Vite service | Public URL of compiler/CRE proxy `/cre/audit` |
| `VITE_CRE_CONSUMER_ADDRESS` | Vite service | `0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0` |
| `VITE_CRE_WORKFLOW_ID` | Vite service | After register |
| `VITE_CRE_AUDIT_TOKEN` | Vite service | Optional; match server |
| `CRE_AUDIT_TOKEN` | Proxy service | Optional shared secret |
| `CRE_CORS_ORIGINS` | Proxy service | Include production app origin |
| `CRE_WORKFLOW_ID` | Proxy service | Live trigger |
| `CRE_TRIGGER_PRIVATE_KEY` | Proxy service | Server only — never `VITE_*` |

Run proxy via `npm run compiler` (or Docker) on Railway as a separate service if the frontend is static-only.
