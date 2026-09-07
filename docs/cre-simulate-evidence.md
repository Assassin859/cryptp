# CRE Confidential simulate evidence (staging)

## Status

**`cre workflow simulate` succeeded** on 2026-09-07 (CLI `v1.32.0`, account logged in).

Workflow package: [`cre/aethon-audit-firewall/`](../cre/aethon-audit-firewall/) — `handlerInTee` + proprietary `evaluateDeployPolicy` + `usingTheDons()` report.

Full transcript: [`cre/evidence/cre-workflow-simulate-staging.txt`](../cre/evidence/cre-workflow-simulate-staging.txt)

## CLI transcript (excerpt)

```text
✓ Workflow compiled
  Binary hash: 19c2f6ad108b03e9765f6609d94c2ce99780009fee6e66900f0ec63cfe6281f7
  Config hash: 028b4ddc9abdb3b16a0234d94c382f9c6646697b799e8761df3c3c635d1e613e
2026-09-07T15:59:52Z [SIMULATION] Running trigger trigger=cron-trigger@1.0.0
│ Trigger requested TEE Execution … AWS Nitro in us-west-2
2026-09-07T15:59:52Z [USER LOG] Enclave audit complete. verdict=ALLOW
✓ Workflow Simulation Result:
"ALLOW (verdictCode: 1, riskMask: 0, reason: Local staging policy found no flagged patterns (not a TEE/CRE verdict))"
```

Reproduce:

```bash
cre login
cre whoami
cd cre
cp .env.example .env   # set SECRET_API_TOKEN (and optional CRE_ETH_PRIVATE_KEY)
cd aethon-audit-firewall && bun install && cd ..
cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings --env ./.env --non-interactive --trigger-index 0
```

Local policy unit evidence (no CLI):

```bash
npm run cre:test
```

See also [`cre/evidence/simulate-stub-result.json`](../cre/evidence/simulate-stub-result.json).

## Onchain Continuity (Sepolia)

| Item | Value |
|------|--------|
| Consumer | [`0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0`](https://sepolia.etherscan.io/address/0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0) |
| Contract | [`AuditFirewallConsumer.sol`](../contracts/AuditFirewallConsumer.sol) |
| Deploy script | `npm run deploy:audit-consumer` |
| IDE settlement | Problem Audit → Confidential → **Record verdict on Sepolia** (owner/authorizedReporter) |

## Account note

`cre whoami` showed **Deploy Access: Not enabled**. Simulate works; live DON register needs `cre account access` / Chainlink enrollment. IDE today uses the Railway stub/proxy gate until a workflow ID is registered.

## Continuity mapping

| Requirement | Location |
|-------------|----------|
| `handlerInTee` (Nitro us-west-2) | [`cre/aethon-audit-firewall/workflow.ts`](../cre/aethon-audit-firewall/workflow.ts) |
| Proprietary policy in enclave | [`cre/aethon-audit-firewall/src/deployPolicy.ts`](../cre/aethon-audit-firewall/src/deployPolicy.ts) |
| IDE gate | `CompileOutput` MetaMask deploy + `IDELayout` promote |
| Onchain state change | Sepolia consumer `0x415c83dDA4E50f50Cd45EBD79FE1fb13a6B21Dc0` |
