# CRE Confidential simulate evidence (staging)

## Status

Aethon ships a **staging-first** Confidential audit workflow under [`cre/aethon-audit-firewall/`](../cre/aethon-audit-firewall/).

Local policy evidence (no CRE CLI):

```bash
node cre/evidence/run-demo.mjs
```

See [`cre/evidence/simulate-stub-result.json`](../cre/evidence/simulate-stub-result.json) after running.

## CRE CLI (operator)

```bash
cre login
cre whoami
cd cre
cp .env.example .env
cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings --env ./.env
```

Paste the CLI transcript below when available:

```
(paste cre workflow simulate output here)
```

## Continuity mapping

| Requirement | Location |
|-------------|----------|
| `handlerInTee` / confidential handler | [`cre/aethon-audit-firewall/src/workflow.ts`](../cre/aethon-audit-firewall/src/workflow.ts) |
| Proprietary policy in TEE | [`cre/aethon-audit-firewall/src/policy.ts`](../cre/aethon-audit-firewall/src/policy.ts) |
| IDE gate | `CompileOutput` MetaMask deploy + `IDELayout` promote |
| Onchain state change | [`contracts/AuditFirewallConsumer.sol`](../contracts/AuditFirewallConsumer.sol) |
