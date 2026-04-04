# 📋 CryptP: Professional Web3 IDE - Master Checklist

This checklist documents every core feature, interaction, and capability within the CryptP suite, integrating the latest **Phase 10: Forensic Analytics & Deep Debugging** additions with our core tools.

---

## 🔐 1. Authentication & Base Infrastructure
- [x] **Multi-Provider Login & Zombie Session Protection**
    - **Interaction**: Users sign in via GitHub or Google. Sessions expire safely in the background.
    - **How to Test**: Login, try to read variables locally, verify "First Project" is generated. Wait for tab expiration boundary.
- [x] **Data Isolation (Row Level Security)**
    - **Interaction**: Users only see their own files and projects.
    - **How to Test**: Create a project logged in as one user. Switch browsers/accounts and verify the project list is empty for the new user.
- [x] **Debounced Cloud Saving**
    - **Interaction**: Typing automatically persists to Supabase after 1 second of inactivity.
    - **How to Test**: Modify `contract A {}`. Switch tabs and instantly refresh the browser. The modifications should persist safely.

---

## 🏗️ 2. Project & Workspace Management
- [x] **Multi-Project Browser (Explorer Tab)**
    - **Interaction**: Group multiple smart contracts into isolated Workspaces.
    - **How to Test**: Create "Project A" and "Project B". Switch between them using the Explorer. Verify tabs and code isolate securely.
- [x] **Global Code Search (Phase 10.5)**
    - **Interaction**: Find specific variables or functions instantly across *all* projects.
    - **How to Test**: Open the **Search** tab (magnifying glass) in the Activity Bar. Type `totalSupply`. Verify it pulls up the exact line number from an inactive project. Click the hit to jump straight to the file.

---

## 💻 3. Professional Smart Contract Editor
- [x] **Asset Factory (No-Code Generation)**
    - **Interaction**: Generate ERC-20, 721, or 1155 tokens via UI toggles.
    - **How to Test**: Select "ERC-721", toggle "Mintable", and click "Inject". Verify the current Editor fills with an OpenZeppelin standard contract.
- [x] **Monaco Editor Integration**
    - **Interaction**: Full syntax highlighting for Solidity.
    - **How to Test**: Check for syntax colors and hover-over bracket matching.
- [x] **Real-time Node.js Compilation**
    - **Interaction**: Uses `solc` behind the scenes to compile contracts.
    - **How to Test**: Make a typo. Hit compile. Verify strict error boundaries parse the output and display exact line numbers.

---

## 🛡️ 4. Security Auditing & Governance
- [x] **Real-time Static Analysis (SAST)**
    - **Interaction**: Background scanning running across 15+ attack vector rules.
    - **How to Test**: Type `tx.origin` or create a reentrancy vector. Verify it flags immediately in the Security Audit tab.
- [x] **Launch Readiness Checklist & PDF Export**
    - **Interaction**: Formal verification checklist before deployment.
    - **How to Test**: Fill out the manual checkpoints in the Security tab and click "Export Report" to download a professional `.json` payload of your security posture.

---

## 📊 5. Forensic Analytics Suite (Phase 10)
*Enterprise-grade insights into contract safety and economics. Accessible via the `BarChart` icon.*

- [x] **Dynamic Security Radar**
    - **Interaction**: Recharts-based visual polygon mapping risk across 5 categories.
    - **How to Test**: Compile a "Taxable Token". Verify the Radar pulls 'Access' and 'Centralization' risks from the AST scanner and morphs the red radar shape.
- [x] **Market Cost Projection**
    - **Interaction**: Live ETH/USD conversions.
    - **How to Test**: Connects to the CoinGecko API in the background to show exactly how much your contract will cost to deploy on Ethereum Mainnet vs Base L2.
- [x] **Storage Slot Map Analyzer**
    - **Interaction**: Visual EVM storage packing detector.
    - **How to Test**: Declare `uint128 a; uint256 b; uint128 c;` in your contract. Compile. Verify it flags **Unpacked Slots** (orange borders) indicating you are wasting gas.

---

## ⚡ 6. Deep Debugging & Trace Profiling (Phase 10)
*Mapping the EVM back to the exact line of code.*

- [x] **In-Browser Blockchain Sandbox**
    - **Interaction**: Deploy instantly without a wallet.
    - **How to Test**: Go to the "Interaction" tab, deploy your code. Verify a simulated transaction hash appears.
- [x] **Contract Interaction Dashboard & Live Event Feed**
    - **Interaction**: Auto-generated UI for ABI functions with event tracking.
    - **How to Test**: Call a `mint` function. Verify the transaction lands and the **Event Log Feed** captures any emitted events.
- [x] **Line-Level Gas Profiler (The Heatmap)**
    - **Interaction**: The crown jewel of Phase 10 deep debugging.
    - **How to Test**: 
        1. Open the **Gas Profiler** (Orange Flame icon in the Right Sidebar).
        2. Execute an expensive `write` function in the Interaction tab.
        3. The flame panel will spin while fetching the `debug_traceTransaction` RPC payload.
        4. Verify it generates a UI Heatmap pinpointing the exact line numbers (e.g., "Line 42: 34,500 gas") where your code was most expensive!

---

> [!TIP]
> **Recommended Bug-Bounty Testing Flow**: Write a gas-inefficient contract -> Check the **Security Radar** and **Storage Slot Map** on the Left Sidebar -> Fix packed slots -> Deploy to Sandbox -> Execute -> Check the **Gas Profiler** on the Right Sidebar for line-by-line tracing.
