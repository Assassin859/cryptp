# CRE Confidential simulate evidence (staging)

## Status

Aethon ships a **staging-first** audit workflow under [`cre/aethon-audit-firewall/`](../cre/aethon-audit-firewall/).

Local policy evidence (no CRE CLI) matches the IDE stub path — **not** a live TEE execution:

```bash
npm run cre:test
# or: node cre/evidence/run-demo.mjs && npm run cre:unit
```

See [`cre/evidence/simulate-stub-result.json`](../cre/evidence/simulate-stub-result.json) after running.

## Onchain Continuity (Sepolia)

| Item | Value |
|------|--------|
| Consumer | [`0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0`](https://sepolia.etherscan.io/address/0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0) |
| Contract | [`AuditFirewallConsumer.sol`](../contracts/AuditFirewallConsumer.sol) |
| Deploy script | `npm run deploy:audit-consumer` |
| IDE settlement | Problem Audit → Confidential → **Record verdict on Sepolia** (owner/authorizedReporter) |

## CRE CLI (operator)

Install from https://docs.chain.link/cre then:

```bash
cre login
cre whoami
cd cre
cp .env.example .env
cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings --env ./.env
```

Paste the CLI transcript below when available:

```
(CRE CLI not yet installed on this workstation — local policy + Sepolia consumer evidence above.
 paste cre workflow simulate output here when CLI is available)
```

## Continuity mapping

| Requirement | Location |
|-------------|----------|
| `handlerInTee` / confidential handler (**target** when registered) | [`cre/aethon-audit-firewall/src/workflow.ts`](../cre/aethon-audit-firewall/src/workflow.ts) |
| Proprietary policy (local staging today; TEE when CRE registered) | [`cre/aethon-audit-firewall/src/policy.ts`](../cre/aethon-audit-firewall/src/policy.ts) |
| IDE gate | `CompileOutput` MetaMask deploy + `IDELayout` promote |
| Onchain state change | Sepolia consumer `0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0` |
