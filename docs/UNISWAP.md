# Uniswap × Aethon (Aethon — v4 hook Continuity)

Continuity upgrade: Aethon’s existing **edit → compile → sandbox → Sepolia** loop gains a **Uniswap v4-style hook** authoring path. No new activity-bar icon.

## Quick start (in the IDE)

1. **Token Factory** → Uniswap Continuity → **v4 CounterHook**, or **New File** → template **Uniswap v4 CounterHook**.
2. Set Solidity **≥ 0.8.24** (user-defined `type Currency`).
3. Compile (WASM).
4. Sandbox deploy: constructor arg = any non-zero address (e.g. Sepolia PoolManager below, or your wallet for `demoCountAsPoolManager`).
5. Call **`sandboxBumpAfterSwap()`** in Interact to bump `afterSwapCount` (Continuity demo helper).
6. **Live CREATE2 (IDE):** switch Execution Environment to MetaMask → leave **Uniswap v4 CREATE2** checked → deploy. Aethon mines the salt in-browser, deploys via the CREATE2 proxy, saves the address (`getCounterHookAddress`), and calls `sandboxBumpAfterSwap` as proof.
7. Optional CLI: `npm run deploy:counter-hook` (Hardhat Sepolia) — same miner.

## Contracts & addresses

| Item | Value |
|------|--------|
| Hook source | [`contracts/hooks/CounterHook.sol`](../contracts/hooks/CounterHook.sol) |
| IDE template id | `uniswap-v4-counter-hook` · [`src/utils/contractTemplates.ts`](../src/utils/contractTemplates.ts) |
| Sepolia PoolManager | [`0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`](https://sepolia.etherscan.io/address/0xE03A1074c86CFeDd5C142C4F04F1a1536e203543) |
| Deployed CounterHook (CREATE2, flags mined) | [`0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0`](https://sepolia.etherscan.io/address/0xC1FEA93ccD6A5B0F0B116E18Ba299198EAA040c0) |
| Deploy script | `npm run deploy:counter-hook` (HookMiner + CREATE2 deployer) |

Optional env: `VITE_UNISWAP_COUNTER_HOOK`, `UNISWAP_V4_POOL_MANAGER`.

## CREATE2 flags

Live Uniswap v4 PoolManager only calls hooks whose **address encodes permission flags**. IDE Output **Uniswap v4 CREATE2** (and `npm run deploy:counter-hook`) mines a salt via [`src/utils/hookMiner.ts`](../src/utils/hookMiner.ts) / [`scripts/hookMiner.ts`](../scripts/hookMiner.ts) and deploys through the CREATE2 Deployer Proxy (`0x4e59…56c`) so the address has `BEFORE_SWAP | AFTER_SWAP` (`0xc0`).

This educational hook uses **self-contained stubs** so browser solc works without vendoring `v4-core`. Production hooks should inherit `BaseHook` from v4-periphery.

## Prize materials

- [`FEEDBACK.md`](../FEEDBACK.md) — required for Uniswap Foundation hackathon judging.
- Submit the [Uniswap Developer Feedback Form](https://developers.uniswap.org/hackathon-feedback) with the `FEEDBACK.md` URL.
