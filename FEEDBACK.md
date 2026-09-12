# FEEDBACK — Uniswap Continuity (CryptP / Aethon IDE)

ETHOnline 2026 Continuity · Uniswap Foundation stack contribution.

**Project:** [Assassin859/cryptp](https://github.com/Assassin859/cryptp) — **Aethon** browser Solidity IDE upgraded with a Uniswap **v4 hook authoring path** (template → WASM compile → sandbox → Sepolia deploy).

**Feedback form:** submit this file’s raw URL via [Uniswap Developer Feedback Form](https://developers.uniswap.org/hackathon-feedback).

---

## What we built

- Educational **CounterHook** (`contracts/hooks/CounterHook.sol`) — v4-style `beforeSwap` / `afterSwap` counters with self-contained type stubs so CryptP’s **browser solc** can compile without vendoring all of `v4-core`.
- IDE wiring: template id `uniswap-v4-counter-hook` in `src/utils/contractTemplates.ts`, New File picker, Token Factory **Uniswap Continuity** inject.
- Sepolia **CREATE2** deploy via HookMiner (`scripts/hookMiner.ts` + `npm run deploy:counter-hook`) so the hook address encodes `BEFORE_SWAP | AFTER_SWAP` against PoolManager `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`.
- Docs: `docs/UNISWAP.md`.

This is Continuity **tooling**: we extended an existing IDE’s compile→deploy loop for Uniswap v4 hooks, not a detached swap dapp.

---

## What worked

1. **Self-contained stubs for IDE compile** — Pulling full `v4-core` / `v4-periphery` into a browser WASM pipeline is heavy. An educational hook with inlined `PoolKey` / `SwapParams` / permission flags let us ship a working CryptP template in one session.
2. **Official Sepolia PoolManager address** is easy to find on [developers.uniswap.org deployments](https://developers.uniswap.org/docs/protocols/v4/deployments).
3. **“First hook” guide** ([docs](https://docs.uniswap.org/contracts/v4/guides/hooks/your-first-hook)) is clear for Foundry + `BaseHook`; good conceptual map for `getHookPermissions` and afterSwap returns.

---

## What was painful / failed expectations

1. **Hook address flags — solved for Continuity** — We initially hit the CREATE2 permission-bit requirement (plain `deploy()` does not attach to live PoolManager). CryptP now ships a Hardhat HookMiner + CREATE2 Deployer Proxy path (`scripts/hookMiner.ts`) so Sepolia demos encode `BEFORE_SWAP|AFTER_SWAP`. A **first-class Hardhat snippet** in Uniswap’s first-hook guide would still help other IDE/tooling teams.
2. **Browser tooling gap** — No first-class path for “compile a BaseHook in the browser without bundling all of v4.” We wished for a published **minimal interface package** (or CDN solc remapping) aimed at educational / IDE embeds.
3. **Constructor + sandbox auth** — Real hooks gate on `msg.sender == poolManager`. For IDE Interact demos we added `sandboxBumpAfterSwap()` clearly marked non-production. A documented “mock PoolManager for local teaching” pattern would reduce reinventing this.

---

## Docs / DX requests for Uniswap Foundation

1. Short **“Educational hook without full Foundry template”** page: minimal interfaces + warning that CREATE2 flags are required for live pools.
2. **Hardhat CREATE2 HookMiner** snippet alongside Foundry in the first-hook / deployment guides.
3. Explicit **Sepolia Continuity checklist** for hackathons: PoolManager address, flag mining, when a standalone deploy is vs isn’t enough for judges.
4. Optional **npm `@uniswap/v4-hooks-education`** (interfaces-only) for browser IDEs.

---

## Pointers for auditors

| Artifact | Path |
|----------|------|
| Hook contract | [`contracts/hooks/CounterHook.sol`](contracts/hooks/CounterHook.sol) |
| IDE template | [`src/utils/contractTemplates.ts`](src/utils/contractTemplates.ts) (`uniswapV4CounterHook`) |
| Deploy | `npm run deploy:counter-hook` · [`scripts/deploy-counter-hook.ts`](scripts/deploy-counter-hook.ts) · [`scripts/hookMiner.ts`](scripts/hookMiner.ts) |
| Sepolia CounterHook (CREATE2) | [`0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0`](https://sepolia.etherscan.io/address/0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0) |
| Guide | [`docs/UNISWAP.md`](docs/UNISWAP.md) |
