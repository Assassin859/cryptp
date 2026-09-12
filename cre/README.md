# Aethon × Chainlink CRE — Confidential Audit Firewall

Continuity upgrade: pre–MetaMask-deploy **AI audit gate** aimed at CRE **Confidential Workflows** (`handlerInTee`).

**Today (staging):** local proprietary policy via IDE proxy (`POST /cre/audit` stub). Not a TEE verdict.

**Policy source of truth:** edit [`cre/shared/deployPolicy.mjs`](shared/deployPolicy.mjs) only, then run `npm run cre:sync-policy` to regenerate the CRE package twin.

**Target (registered CRE workflow):** policy + API secrets in TEE; only `ALLOW` / `DENY` / `MANUAL_REVIEW` + `riskMask` leave the enclave.

## Staging first

```bash
cd cre/aethon-audit-firewall
bun install
npm test

# With CRE CLI (operator machine):
cd ..
cp .env.example .env   # set SECRET_API_TOKEN
cre login && cre whoami
cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings --env ./.env --non-interactive --trigger-index 0
```

Simulate evidence: `cre/evidence/cre-workflow-simulate-staging.txt` and `docs/cre-simulate-evidence.md`.

**Triggers:** cron (index 0) audits `sampleSource` for simulate only. Live IDE audits use the **HTTP** trigger (`sourceCode` + `sourceHash` from `cre-proxy`).

## Deploy (when access enabled)

```bash
# From repo root — print the address for http_trigger.authorizedKeys
npm run cre:print-trigger

cre account access   # request deploy if needed
# Paste authorizedKeys into config.staging.json / config.production.json
# Set evms[0].consumer_address to deployed AuditFirewallConsumer
cre workflow register ./aethon-audit-firewall --project-root ./ --target=production-settings
# Note Workflow ID → VITE_CRE_WORKFLOW_ID / CRE_WORKFLOW_ID for the Express proxy
```

HTTP trigger production docs: https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/triggering-deployed-workflows

## IDE bridge

Aethon calls `POST /cre/audit` on the compiler/CRE proxy (stub/local policy until workflow is deployed). Live mode JWT-triggers the HTTP handler with IDE payload; gateway accept returns `accepted` (not gateable until verdict polling). Live MetaMask deploy is gated on a gateable stub `ALLOW`.
