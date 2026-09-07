# Uniswap × CryptP (v4 hook Continuity)

Continuity upgrade: CryptP’s existing **edit → compile → sandbox → Sepolia** loop gains a **Uniswap v4-style hook** authoring path. No new activity-bar icon.

## Quick start (in the IDE)

1. **Token Factory** → Uniswap Continuity → **v4 CounterHook**, or **New File** → template **Uniswap v4 CounterHook**.
2. Set Solidity **≥ 0.8.24** (user-defined `type Currency`).
3. Compile (WASM).
4. Sandbox deploy: constructor arg = any non-zero address (e.g. Sepolia PoolManager below, or your wallet for `demoCountAsPoolManager`).
5. Call **`sandboxBumpAfterSwap()`** in Interact to bump `afterSwapCount` (Continuity demo helper).
6. Optional live deploy: `npm run deploy:counter-hook` (Hardhat Sepolia).

## Contracts & addresses

| Item | Value |
|------|--------|
| Hook source | [`contracts/hooks/CounterHook.sol`](../contracts/hooks/CounterHook.sol) |
| IDE template id | `uniswap-v4-counter-hook` · [`src/utils/contractTemplates.ts`](../src/utils/contractTemplates.ts) |
| Sepolia PoolManager | [`0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`](https://sepolia.etherscan.io/address/0xE03A1074c86CFeDd5C142C4F04F1a1536e203543) |
| Deployed CounterHook | [`0x99d2Cfa4aD9ba4302D263dfEd6E3372EE4940E9e`](https://sepolia.etherscan.io/address/0x99d2Cfa4aD9ba4302D263dfEd6E3372EE4940E9e) |
| Deploy script | `npm run deploy:counter-hook` |

Optional env: `VITE_UNISWAP_COUNTER_HOOK`, `UNISWAP_V4_POOL_MANAGER`.

## Important: CREATE2 flags

Live Uniswap v4 PoolManager only calls hooks whose **address encodes permission flags**. A plain Hardhat deploy proves Continuity bytecode on Sepolia but does **not** attach to a production pool. For pool attachment, mine the hook with CREATE2 / HookMiner (see [Your first hook](https://docs.uniswap.org/contracts/v4/guides/hooks/your-first-hook)).

This educational hook uses **self-contained stubs** so browser solc works without vendoring `v4-core`. Production hooks should inherit `BaseHook` from v4-periphery.

## Prize materials

- [`FEEDBACK.md`](../FEEDBACK.md) — required for Uniswap Foundation hackathon judging.
- Submit the [Uniswap Developer Feedback Form](https://developers.uniswap.org/hackathon-feedback) with the `FEEDBACK.md` URL.
