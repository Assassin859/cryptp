# CryptP IDE — Deep Audit Report

**Date:** September 1, 2026  
**Scope:** Full codebase — logic, security, structure, schema, CI, documentation  
**Status:** Analysis only — no fixes applied in this document

---

## Executive Summary

CryptP IDE is a functional browser-native Solidity development environment with a live production deployment, passing Playwright smoke tests (31 PASS / 0 FAIL), and a verified Sepolia testnet deployment. Despite that, the audit identified **50+ issues** across sandbox rehydration, state management, compiler security, token generation, schema drift, and documentation accuracy.

| Severity | Count (approx.) |
|----------|-----------------|
| Critical | 4 |
| High | 23 |
| Medium | 20 |
| Low | 10 |

---

## What Works (Verified)

- **Production app:** https://cryptp-production.up.railway.app/ (HTTP 200)
- **Source:** https://github.com/Assassin859/cryptp
- **Playwright E2E:** 31 PASS, 0 FAIL, 8 SKIP, 4 BLOCKED (MetaMask in headless CI)
- **Sepolia proof:** `0xccF63e5C7c3FE2fD9C24CD59038aea674702907b`
- **`npm run build`:** Passes (with chunk size warning ~1.3 MB)
- **Stale-compile deploy gate:** Implemented via `canDeploy` + `lastCompiledSourceRef`
- **DeploymentGuide / CallTraceVisualizer:** Wired in IDE (smoke report incorrectly listed them as N/A)

---

## Critical

### C1. Transaction hashes stale after sandbox rehydrate

| | |
|---|---|
| **Files** | `src/utils/sandboxRehydrate.ts` (L34–44), `src/utils/browserVM.ts` (L148–207), `src/utils/userData.ts` (L510–517) |
| **Bug** | `browserVM.rehydrate()` builds `txHashMap` (DB deployment id → new VM tx hash) but `rehydrateSandboxFromDb` only uses `addressMap`. UI simulations still use stored `d.tx_hash` via `deploymentToSimulation()`. |
| **Impact** | After page reload or project switch, gas profiler and trace lookup fail (`getTransactionTrace(storedHash)` returns null) even when contract state replayed correctly. |

### C2. New-user bootstrap races with rehydrate

| | |
|---|---|
| **File** | `src/components/IDELayout.tsx` (L276–411, L419–480) |
| **Bug** | `setCurrentProject()` triggers rehydrate effect while starter-workspace bootstrap compile/deploy runs in parallel. Rehydrate calls `browserVM.reset()` before DB rows exist. |
| **Impact** | UI shows deployments; VM has no contract — interact panel fails with “not deployed at this address.” |

### C3. Project rehydrate dropped when switching projects quickly

| | |
|---|---|
| **File** | `src/components/IDELayout.tsx` (L424–425) |
| **Bug** | `if (rehydrateInFlight.current) return;` — a second project switch while rehydrate is in-flight is silently skipped. |
| **Impact** | Wrong simulations and VM state for the active project. |

### C4. Hardcoded E2E credentials in repository

| | |
|---|---|
| **Files** | `tests/e2e/ide-smoke.spec.ts` (L5–7), `tests/e2e/mobile-shell.spec.ts` (L13–14) |
| **Bug** | Fallback smoke credentials were previously committed in e2e specs. Working tree now requires `SMOKE_EMAIL` / `SMOKE_PASSWORD` env vars only. |
| **Impact** | Rotate the dedicated smoke-test account password in Supabase Auth if it was ever shared or committed. Scrub git history if old hashes remain public. |

---

## High — Logic & State (`IDELayout.tsx`)

| ID | Issue | Impact |
|----|-------|--------|
| H1 | Per-file `fileStateCache` stores project-level `simulations` | Wrong or empty deployment history on file switch |
| H2 | `restoreCompilation` effect depends on `code` — runs on every keystroke | UI flicker, wasted work, races with in-flight compiles |
| H3 | `active_file_id` never persisted on file select | Reload opens wrong file |
| H4 | `handleResetChain` clears UI before DB delete — no rollback on failure | Empty UI with DB data still intact |
| H5 | `persistDeployment` is fire-and-forget | Deployments lost after refresh if DB save fails |
| H6 | `lastCompilationId` global ref can link wrong file’s compilation to deployment | Incorrect deployment metadata |
| H7 | Code edit clears `activeDeployment` project-wide | Interact context lost even when deploy is from another file |
| H8 | Rehydrate picks `activeDeployment` ABI from possibly stale `compileResult` | Interact panel with wrong/missing ABI |
| H9 | No async effect cancellation on unmount / user switch | Stale state writes after logout or project change |
| H10 | ZIP import: no path sanitization or size limits | Zip-slip (`../`), zip bomb, unbounded memory risk |
| H11 | Stale closure in modal handlers using `projects` instead of functional `setProjects` | Lost updates under concurrent mutations |
| H12 | API keys synced to plaintext `localStorage` | XSS or shared-machine exposure |

---

## High — EVM (`browserVM.ts`)

| ID | Issue | Impact |
|----|-------|--------|
| H13 | EVM event listeners not removed in `finally` if `runTx` throws | Listener leak, duplicated traces, memory growth |
| H14 | `init()` succeeds silently when EVM init fails | Generic “VM not initialized” with no surfaced `initError` |
| H15 | Global singleton VM — multiple tabs share one instance | Last tab to rehydrate wins; cross-tab corruption |
| H16 | Block number not synced with VM after rehydrate | UI shows historical block numbers inconsistent with VM |
| H17 | Predictable sandbox private keys (`1111…`, `2222…`) | Acceptable for sandbox; dangerous if bridged to real networks |

---

## High — Compile & Deploy

| ID | File | Issue | Impact |
|----|------|-------|--------|
| H18 | `CompileOutput.tsx` (L274–283) | Unnamed constructor args collide on empty string key | Wrong constructor values at deploy |
| H19 | `constructorArgs.ts` (L16–26) | Invalid uint/int silently become `0n` | Deploy with wrong initial state |
| H20 | `constructorArgs.ts` (L62–65) | `encodeConstructorSuffix` assumes uint256 when ABI missing | Rehydrated bytecode differs from original |
| H21 | `compiler.worker.ts` (L40–65) | Fetched soljson executed via `new Function()` — no SRI/hash pin | Supply-chain code execution in worker |
| H22 | `compiler.worker.ts` (L140–142) | `LOAD_VERSION` accepts URL without allowlist validation | Arbitrary script load if caller passes bad URL |
| H23 | `hardhatCompiler.ts` (L161–256) | jsDelivr imports for OpenZeppelin — no integrity checks | Tampered deps compile into user contracts |
| H24 | `hardhatCompiler.ts` (L377–388) | `hardcodedBytecode` path returns fake ABI unrelated to bytecode | Misleading success / broken deploy |
| H25 | `hardhatCompiler.ts` (L77, L279–285) | Global `compileInFlight` lock blocks concurrent compiles app-wide | Parallel compile requests fail |

---

## High — Security Scanner (`securityScanner.ts`)

| ID | Issue | Impact |
|----|-------|--------|
| H26 | Parse failures caught silently → empty findings, score ~100 | False “secure” rating on broken/malicious Solidity |
| H27 | Rule SWC-104 (Unchecked Return Value) defined but never implemented | Incomplete advertised coverage |
| H28 | Weak `msg.sender` auth detection suppresses S016 false negatives | Missing access control not flagged |
| H29 | Reentrancy rule S001 uses line-order heuristics only | High false positive/negative rate |

---

## High — Token Factory (`tokenGenerator.ts`)

| ID | Issue | Impact |
|----|-------|--------|
| H30 | ERC721 uses `_nextTokenId()` — not in OpenZeppelin Contracts 5.x (L176) | Generated ERC721 contracts **fail to compile** |
| H31 | `accessControl === 'None'` + mintable → public mint with no modifier | Anyone can mint — dangerous default |
| H32 | No string escaping in generated Solidity (`name`, `symbol`, `baseUri`) | Broken or injectable source if called outside UI |
| H33 | ERC20 votes path references `Nonces` without import | Compile error when votes enabled |

---

## High — Auth, GitHub & Secrets

| ID | File | Issue | Impact |
|----|------|-------|--------|
| H34 | `github.ts` (L15–37) | GitHub OAuth `provider_token` used client-side for API calls | XSS can exfiltrate repo-scoped token |
| H35 | `App.tsx`, `Auth.tsx` | Sign-out / idle logout preserves `*-keys` in localStorage | AI/RPC keys remain on shared machines |
| H36 | `.env` (local) | Contains `SUPABASE_SERVICE_ROLE_KEY` and `POSTGRES_URL` — must never be committed | Full DB bypass if leaked |
| H37 | `supabaseClient.ts` | `persistSession: false` + `autoRefreshToken: true` | Ambiguous session persistence behavior |

---

## High — Rehydrate Edge Cases (`sandboxRehydrate.ts`)

| ID | Issue | Impact |
|----|-------|--------|
| H38 | If only `promoted` deployments exist and replay log is empty, `allDeployments = []` | Deployment history hidden after reload |
| H39 | Partial replay failure leaves VM/UI inconsistent | UI shows full list; VM missing contracts |
| H40 | Profiler restored without `traceTree` | Gas profiler tree view empty after reload |

---

## Medium — Database & Schema

| ID | Issue | Impact |
|----|-------|--------|
| M1 | `files.path` column never written; paths encoded in `files.name` only | Schema drift |
| M2 | `projects.folders text[]` never read/written | Dead column |
| M3 | `snapshots` table exists but no insert/upsert anywhere | Dead table |
| M4 | `gas_profiles.risk_distribution`, `optimization_data` never written | Dead columns |
| M5 | `user_settings` table may be missing on DB if partial migration run | Settings/AI keys fail |
| M6 | Three SQL files, no single documented bootstrap path in README/INSTALLATION | New projects fail on first DB write |
| M7 | `deleteProject` ignores errors on intermediate table deletes | Orphaned rows possible |

---

## Medium — CI, Node & Tooling

| ID | Issue | Impact |
|----|-------|--------|
| M8 | Hardhat 3 requires Node 22.13+; fails on Node 20 | `npm run compile`, `npm test` broken on documented/CI Node version |
| M9 | CI (`.github/workflows/playwright.yml`) runs Playwright only | No lint, build, Hardhat, or unit test gates |
| M10 | `npm run compiler` references missing `compilerBackend.mjs` | Script fails if invoked |
| M11 | `securityScanner.test.ts` has no npm script; ESLint ignores `test/**` | Scanner regressions undetected |
| M12 | Unused runtime deps: `express`, `cors`, `node-fetch`, npm `solc` | Bundle/install bloat |
| M13 | Unused Hardhat packages: `hardhat-toolbox`, `hardhat-ignition` not in plugins | Misleading devDeps |
| M14 | `dist-test/`, `test-results/.last-run.json` tracked in git | Generated artifacts in repo |
| M15 | Railway production last-modified Jul 18, 2026 | May lag behind local fixes |

---

## Medium — Documentation vs Reality

| Doc / Claim | Reality |
|-------------|---------|
| README “Zero-Config” | Supabase env vars required |
| Checklist “Real-time Node.js Compilation / solc behind the scenes” | Browser WASM worker (`compiler.worker.ts`) |
| README compiler support “0.4.x to 0.8.x” | Discrete versions only in `compilerVersions.ts` |
| `docs/DEPLOYMENT.md`, `docs/CUSTOMIZATION.md` | Remix-centric flows; contradicts browser-native positioning |
| `docs/SMOKE_TEST_REPORT.md` — DeploymentGuide / CallTraceVisualizer “not wired” | **Incorrect** — both are mounted (`IDELayout.tsx:1610`, `GasProfiler.tsx:157`) |
| `.env.example` documents many `VITE_*` vars | Only `VITE_SUPABASE_*` used in `src/` |
| Hardhat env vars missing from `.env.example` | `SEPOLIA_*`, `MAINNET_*`, `ETHERSCAN_API_KEY` undocumented |
| `CONTRIBUTING.md` example RTL tests | No Vitest/Jest setup exists |

---

## Medium — Web3 & Other

| ID | File | Issue | Impact |
|----|------|-------|--------|
| M16 | `Web3Context.tsx` | No validation that connected `chainId` is supported before exposing signer | Transactions on unexpected chains |
| M17 | `Web3Context.tsx` | `chainChanged` forces full page reload | Reload loops on rapid chain switching |
| M18 | `hardhatCompiler.ts` | `generateDeploymentSimulation` uses `Math.random()` for tx hashes | Easy to mistake for real on-chain data |
| M19 | `github.ts` | No URL encoding on path segments; repo list capped at 100 | API errors; missing repos |
| M20 | `vite.config.ts` | Main chunk ~1.3 MB; `'process.env': {}` wipes env at build time | Performance; fragile libs |

---

## Low

| ID | Issue | Location |
|----|-------|----------|
| L1 | Misleading filenames: `hardhatCompiler.ts`, `compileWithHardhat` | `src/utils/` |
| L2 | `DeploymentGuide` full-page variant never mounted (~170 lines dead) | `DeploymentGuide.tsx` |
| L3 | Duplicate npm scripts: `smoke` === `smoke:full` | `package.json` |
| L4 | `copyToClipboard` swallows errors | `CompileOutput.tsx` |
| L5 | `triggerAIDeploy` swallows failures | `IDELayout.tsx` |
| L6 | Incomplete component barrel export | `src/components/index.ts` |
| L7 | `scripts/check-db.mjs` not referenced in docs or package.json | `scripts/` |
| L8 | `package.json` version `0.0.0` vs `.env.example` `VITE_APP_VERSION=1.0.0` | Metadata drift |
| L9 | `mousemove` resets idle timer — effective timeout often > 15 min | `App.tsx` |
| L10 | Deprecated `supabase` Proxy still used in some files | `supabaseClient.ts`, `Auth.tsx` |

---

## Security Scanner — Additional Notes

- `block.timestamp` flagged unconditionally — noisy for benign logging
- `INTEGER_OVERFLOW_LEGACY` fires on every arithmetic op for version < 0.8 — massive false positives
- `summary.critical` only counts reentrancy (S001) — inconsistent severity reporting
- `DELEGATECALL_UNTRUSTED` whitelist too narrow

---

## Cross-Cutting Themes

1. **Supply chain / code execution:** Compiler worker + CDN import resolver are the highest-risk surfaces — remote JS runs in-browser without integrity verification.

2. **False security assurance:** Scanner silent failures, hardcoded bytecode fake ABI, and simulated deployment data can all present “green” states that do not reflect real safety or deployability.

3. **Secret persistence after logout:** Auth/App idle-timeout flows deliberately keep API keys in localStorage.

4. **OAuth token in browser:** GitHub integration exposes full provider tokens to client-side code.

5. **Missing validation at utility boundaries:** `tokenGenerator`, `github`, and compiler paths assume trusted UI inputs; utilities are callable without validation.

6. **Singleton VM:** Global `browserVM` means multiple tabs share no isolation.

---

## Recommended Fix Priority (Reference Only — Not Executed)

### Phase A — Correctness (demo-critical)
1. Remap `txHashMap` in `sandboxRehydrate` when building simulations
2. Serialize bootstrap vs rehydrate for new users
3. Queue/cancel rehydrate on project switch (AbortController)
4. Fix ERC721 `_nextTokenId` → OpenZeppelin 5.x API in `tokenGenerator.ts`
5. Remove/rotate hardcoded test credentials

### Phase B — Security
6. Pin/allowlist compiler CDN URLs; add integrity checks for soljson + OpenZeppelin imports
7. Security scanner fail-closed on parse error; implement SWC-104
8. Move GitHub API to Supabase Edge Function (hide `provider_token`)
9. Audit git history for `.env` leaks; rotate service role key if exposed

### Phase C — Structure
10. Document Supabase bootstrap in README; align CI to Node 22; add build/lint to CI
11. Prune unused dependencies; remove `dist-test/` from git
12. Reconcile documentation (Checklist compilation claim, smoke report dead-code section)

---

## Related Files

| Resource | Path |
|----------|------|
| Smoke test report | `docs/SMOKE_TEST_REPORT.md` |
| Manual QA gaps | `docs/MANUAL_QA.md` |
| Feature checklist | `Checklist.md` |
| Supabase schema | `supabase-schema.sql` |
| Persistence migration | `supabase-migration-persistence.sql` |
| CI workflow | `.github/workflows/playwright.yml` |

---

*This report is for internal tracking and hackathon preparation. It does not imply that all listed issues block basic IDE usage — many are edge cases, defense-in-depth gaps, or documentation drift.*
