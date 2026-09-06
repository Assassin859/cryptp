<div align="center">
  <h1>🚀 CryptP IDE</h1>
  <p><b>The Browser-Native Ethereum Lab</b></p>
  <p>
    <a href="https://twitter.com/assassin_859">
      <img src="https://img.shields.io/twitter/follow/assassin_859?style=social" alt="Twitter Follow" />
    </a>
  </p>
</div>

**CryptP IDE** is a high-performance, professional-grade development environment for Solidity smart contracts engineered by **[Maitreya Gaikwad](https://github.com/Assassin859)**. It runs **entirely in your browser**, eliminating the need for local toolchains and providing a "Zero-Config" experience for building, compiling, and profiling DeFi protocols.

![CryptP IDE Preview](docs/images/preview.png)

---

## ⚡ Instant Project Awareness

### The Core Loop
```mermaid
graph TD
    A[Solidity Editor] -- Source --> B[Compiler Worker]
    B -- WASM solc-js --> C[ABI & Bytecode]
    C -- Local Deploy --> D[Browser EVM VM]
    D -- Step Tracking --> E[Execution Trace]
    E -- Trace Mapper --> F[Line-by-Line Gas Heatmap]
    F -- UI Feedback --> A
    D -- Promotion --> G[MetaMask / Live Network]
```

### Why CryptP?
- **Hyper-Local Performance**: Compiles Solidity in a background WASM worker. No more waiting for server-side responses.
- **True In-Browser EVM**: Powered by `@ethereumjs/vm`, ensuring 100% state and math accuracy without a local node.
- **Insight-Driven Profiling**: Visualizes gas consumption line-by-line, allowing you to optimize contracts during development.
- **Studio-Ready UX**: Integrated AI assistant, security auditor, and one-click token factories.
- **The Graph (Indexed)**: Query on-chain `ValueChanged` history in-IDE via a platform Sepolia subgraph, or paste your own Graph Studio endpoint (Settings / Indexed). See [docs/THE_GRAPH.md](docs/THE_GRAPH.md).

---

## 📂 Project Rosetta Stone

| Directory | Purpose | Key File |
| :--- | :--- | :--- |
| **`src/utils/`** | The "Engine Room" of the IDE. | `browserVM.ts` (The local chain) |
| **`src/components/`** | Modular UI components for the IDE layout. | `SolidityEditor.tsx` (Monaco wrapper) |
| **`contracts/`** | Smart contract templates and local storage. | `Counter.sol` (Example template) |
| **`scripts/`** | Deployment logic for real-world networks. | `deploy.ts` (Hardhat script) |
| **`ignition/`** | Hardhat Ignition deployment modules. | `Counter.ts` |
| **`docs/`** | Deep-dive documentation for users. | `INSTALLATION.md` |

---

## 🛠️ Internal Architecture Deep-Dive

### 📡 The Compiler Pipeline (`src/utils/compiler.worker.ts`)
We bypass heavy NPM dependencies by dynamically loading lightweight **WASM binaries** from the official Solidity binaries server. This ensures version compatibility (0.4.x to 0.8.x) without bloating the frontend bundle.

### ⛓️ The Virtual Blockchain (`src/utils/browserVM.ts`)
Using `@ethereumjs/vm`, we spawn a full blockchain instance in your browser RAM. 
- **Persistence**: Workspaces are saved to **Supabase** via `userData.ts`.
- **Interactivity**: `ContractInteraction.tsx` dynamically generates UIs from your contract's ABI.

### 🔍 Execution Insights (`src/utils/traceMapper.ts`)
During execution, the VM emits "step" events. We map these Program Counters (PC) back to your source code lines using the compiler's source map, creating the **Gas Heatmap**.

---

## 🚀 Getting Started

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Setup** (required):
   Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your [Supabase](https://supabase.com/dashboard) project (Settings → API).

   Optional Continuity / The Graph (operator): `VITE_GRAPH_ENDPOINT`, `VITE_GRAPH_REGISTRY_ADDRESS` — see [docs/THE_GRAPH.md](docs/THE_GRAPH.md). Users can also paste a Studio URL in **Settings → The Graph**.

3. **Launch the Engine**:
   ```bash
   npm run dev
   ```

---

The built-in security audit uses static AST heuristics for fast feedback during development. It is not a substitute for Slither, formal verification, or a professional audit before mainnet deployment.

## 🧪 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Blockchain**: Ethers.js v6, EthereumJS (`@ethereumjs/vm`, `@ethereumjs/tx`)
- **Backend/Auth**: Supabase
- **Build**: Vite

---

*Built with ❤️ for the DeFi Developer Community.*
