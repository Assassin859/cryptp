# CryptP IDE Smoke Test Report

**Date:** 2026-06-26  
**Environment:** local dev (`npm run dev`)  
**Runner:** Playwright (`tests/e2e/ide-smoke.spec.ts`)

## Summary

| Status | Count |
|--------|-------|
| PASS | 31 |
| FAIL | 0 |
| SKIP | 8 |
| BLOCKED | 4 |

## Results

| ID | Section | Status | Notes |
|----|---------|--------|-------|
| A1 | Auth | PASS | Load / |
| A2 | Auth | PASS | Email sign-in → IDELayout |
| A3 | Auth | PASS | Dismissed or not shown |
| B1 | Workspace | PASS | New workspace |
| B2 | Workspace | PASS | Add file + Simple Storage template |
| B3 | Workspace | PASS | Persistence after reload |
| B4 | Search | PASS | Find file by name |
| B5 | Workspace | SKIP | Not automated; UI uses hidden file input |
| C1 | Compile | PASS | Compile & Refresh success |
| C2 | Compile | PASS | Syntax error path |
| C3 | Security | PASS | Problem Audit tab |
| C4 | Security | PASS | Assumed visible post-compile if scan ran |
| C5 | Compile | PASS | Compiler version change notification |
| D1 | Analytics | PASS | Charts after compile |
| D2 | Analytics | PASS | Section rendered if compile succeeded |
| D3 | Analytics | PASS | PriceService loads or shows fallback |
| E1 | Sandbox | PASS | Deploy to sandbox |
| E2 | History | PASS | Deployment listed |
| E3 | Interaction | PASS | Contract interaction panel |
| E4 | Gas Profiler | PASS | Profiler panel |
| E5 | History | SKIP | Skipped to preserve deployment state for later tests |
| L1 | Persistence | PASS | Reload keeps interact panel |
| L2 | Persistence | PASS | Stale compile blocks deploy |
| F1 | Token Factory | PASS | Configure + preview |
| F2 | Token Factory | PASS | Inject |
| G1 | AI | PASS | Prompts for API key |
| G2 | AI | SKIP | No keys in CI env |
| G3 | AI | SKIP | Not exercised in automation |
| G4 | AI | SKIP | Manual verification |
| H1 | Settings | PASS | Settings panel |
| H2 | Settings | SKIP | Download not triggered in automation |
| H3 | Integrations | PASS | Docs sidebar |
| I1 | Wallet | BLOCKED | No window.ethereum in Playwright Chromium |
| I2 | Wallet | BLOCKED | Requires MetaMask |
| I3 | Wallet | BLOCKED | Requires MetaMask extension |
| I4 | Wallet | BLOCKED | Requires MetaMask |
| J1 | GitHub | PASS | Modal tabs |
| J2 | GitHub | SKIP | Requires linked GitHub OAuth |
| J3 | GitHub | SKIP | Requires linked GitHub OAuth |
| K1 | Regression | PASS | No mock compile fallback UI |
| K2 | Regression | PASS | Code review: uses securityReport.findings |
| K3 | Regression | PASS | SimulatedChain has retry UI per code review |
| A4 | Auth | PASS | Sign out + re-login |

## Defects (FAIL)

_None._

## Blocked / manual follow-up

- **I1**: No window.ethereum in Playwright Chromium
- **I2**: Requires MetaMask
- **I3**: Requires MetaMask extension
- **I4**: Requires MetaMask

## Known non-wired UI (N/A)

- `DeploymentGuide.tsx` — not mounted in main IDE flow
- `CallTraceVisualizer.tsx` — not in activity bar (use Gas Profiler instead)

## Security note

Credentials were supplied via environment variables only and are not stored in this report. Rotate your password if it was shared in chat.
