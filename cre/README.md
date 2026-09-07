# Aethon × Chainlink CRE — Confidential Audit Firewall

Continuity upgrade: pre–MetaMask-deploy **AI audit gate** aimed at CRE **Confidential Workflows** (`handlerInTee`).

**Today (staging):** local proprietary policy via IDE proxy (`POST /cre/audit` stub). Not a TEE verdict.

**Target (registered CRE workflow):** policy + API secrets in TEE; only `ALLOW` / `DENY` / `MANUAL_REVIEW` + `riskMask` leave the enclave.

## Staging first

```bash
cd cre/aethon-audit-firewall
npm install   # or bun install
npm test

# Local policy evidence (no CRE CLI required):
npx tsx src/workflow.ts

# With CRE CLI (operator machine):
cd ..
cp .env.example .env
cre login
cre whoami
cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings --env ./.env
```

Save simulate logs under `cre/evidence/` and `docs/cre-simulate-evidence.md`.

## Deploy (when access enabled)

```bash
cre account access   # request deploy if needed
# Set http_trigger.authorizedKeys to the proxy signer address
# Set evms[0].consumer_address to deployed AuditFirewallConsumer
cre workflow register ./aethon-audit-firewall --project-root ./ --target=production-settings
# Note Workflow ID → VITE_CRE_WORKFLOW_ID / CRE_WORKFLOW_ID for the Express proxy
```

HTTP trigger production docs: https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/triggering-deployed-workflows

## IDE bridge

Aethon calls `POST /cre/audit` on the compiler/CRE proxy (stub/local policy until workflow is deployed). Live gateway accept returns `accepted` (not gateable). Live MetaMask deploy is gated on a gateable stub `ALLOW`.
