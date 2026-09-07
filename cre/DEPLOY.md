# CRE deploy checklist (when access is ready)

Staging package and IDE gates ship without live DON access. Complete this when `cre whoami` shows deploy enabled.

## 1. Auth

```bash
cre login
cre whoami
cre account access   # request if Deploy Access: Not enabled
```

## 2. Configure production

Edit `cre/aethon-audit-firewall/config.production.json`:

- `scanner_url` / LLM URLs (or keep mock for Continuity demo)
- `http_trigger.authorizedKeys`: address of `CRE_TRIGGER_PRIVATE_KEY`
- `evms[0].consumer_address`: deployed `AuditFirewallConsumer`

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
VITE_CRE_CONSUMER_ADDRESS=0x...
```

## 4. Point Aethon at live mode

Settings → Chainlink CRE → **Live CRE** → Save.

Proxy (`npm run compiler`) will JWT-trigger the gateway; on gateway accept it still applies policy for immediate IDE verdict and attaches `executionId`.

## 5. Demo path

Compile → Problem Audit → Confidential → ALLOW → MetaMask deploy → optional `recordVerdict` on consumer.
