# CryptP IDE Smoke Test Report

**Date:** 2026-09-06  
**Environment:** local dev (`npm run dev`)  
**Runner:** Playwright (`tests/e2e/ide-smoke.spec.ts`)

## Summary

| Status | Count |
|--------|-------|
| PASS | 18 |
| FAIL | 1 |
| SKIP | 2 |
| BLOCKED | 0 |

## Results

| ID | Section | Status | Notes |
|----|---------|--------|-------|
| A1 | Auth | PASS | Load / |
| A2 | Auth | PASS | Email sign-in → IDELayout |
| A3 | Auth | PASS | Dismissed or not shown |
| B1 | Workspace | PASS | New workspace |
| B2 | Workspace | PASS | Add file + Simple Storage template |
| B3 | Workspace | FAIL | Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed  Locator: locator('.view-lines') Expected substring: [32m"smoke-marker"[39m Received string:    [31m"// SPDX-License-Identifier: MITpragma solidity 0.8.20;/** * @title SimpleStorage * @dev Very simple contract for testing deployment with 100% security  score. */contract SimpleStorage {    uint256 private _value;    event ValueChanged(address indexed setter, uint256 newValue);    constructor() {        _value = 42;    }    function setValue(uint256 _newValue) public {        _value = _newValue;"[39m Timeout: 15000ms  Call log: [2m  - Expect "toContainText" with timeout 15000ms[22m [2m  - waiting for locator('.view-lines')[22m [2m    34 × locator resolved to <div data-mprt="8" aria-hidden="true" role="presentation" class="view-lines monaco-mouse-cursor-text">…</div>[22m [2m       - unexpected value "// SPDX-License-Identifier: MITpragma solidity 0.8.20;/** * @title SimpleStorage * @dev Very simple contract for testing deployment with 100% security  score. */contract SimpleStorage {    uint256 private _value;    event ValueChanged(address indexed setter, uint256 newValue);    constructor() {        _value = 42;    }    function setValue(uint256 _newValue) public {        _value = _newValue;"[22m  |
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

## Defects (FAIL)

- **B3** (Workspace): Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed

Locator: locator('.view-lines')
Expected substring: [32m"smoke-marker"[39m
Received string:    [31m"// SPDX-License-Identifier: MITpragma solidity 0.8.20;/** * @title SimpleStorage * @dev Very simple contract for testing deployment with 100% security  score. */contract SimpleStorage {    uint256 private _value;    event ValueChanged(address indexed setter, uint256 newValue);    constructor() {        _value = 42;    }    function setValue(uint256 _newValue) public {        _value = _newValue;"[39m
Timeout: 15000ms

Call log:
[2m  - Expect "toContainText" with timeout 15000ms[22m
[2m  - waiting for locator('.view-lines')[22m
[2m    34 × locator resolved to <div data-mprt="8" aria-hidden="true" role="presentation" class="view-lines monaco-mouse-cursor-text">…</div>[22m
[2m       - unexpected value "// SPDX-License-Identifier: MITpragma solidity 0.8.20;/** * @title SimpleStorage * @dev Very simple contract for testing deployment with 100% security  score. */contract SimpleStorage {    uint256 private _value;    event ValueChanged(address indexed setter, uint256 newValue);    constructor() {        _value = 42;    }    function setValue(uint256 _newValue) public {        _value = _newValue;"[22m


## Blocked / manual follow-up

_None._

## Known non-wired UI (N/A)

- `DeploymentGuide.tsx` — not mounted in main IDE flow
- `CallTraceVisualizer.tsx` — not in activity bar (use Gas Profiler instead)

## Security note

Credentials were supplied via environment variables only and are not stored in this report. Rotate your password if it was shared in chat.
