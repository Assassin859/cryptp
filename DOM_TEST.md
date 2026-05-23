# CryptP IDE | Comprehensive DOM Verification Protocol

This document serves as the master test suite for end-to-end verification of the CryptP IDE. It covers workspace management, compiler integrity, security intelligence, and real-time analytics.

---

## 🚀 Execution Prerequisites

- **Testing Environment**: Local Sandbox / Production Staging
- **Primary Credentials**: `codeemail001@gmail.com` / `Assassin@01`
- **Database Dependency**: Ensure `public.deployments` includes the `abi` column for interaction persistence.

---

## 🛠 Phase 1: Security Intelligence & Compiler Logic

The primary goal is to verify the accuracy of the **Security Scoring Engine** and the stability of the **Hardhat Compiler Backend**.

> [!IMPORTANT]
> The compiler logic in `hardhatCompiler.ts` has been patched to resolve previous "Compilation Failed" errors. Verification should confirm 100% reliability across all valid profiles.

### 🧪 Test Profiles

| Profile | Target Score | Key Characteristics |
| :--- | :--- | :--- |
| **🏆 Profile 1: Secure** | **100%** | Fixed pragma, event logging, indexed parameters, no owner-only risks. |
| **⚠️ Profile 2: Risky** | **~75%** | Floating pragma (-5), `tx.origin` usage (-15), missing events (-5). |
| **🛑 Profile 3: Broken** | **N/A** | Intentional syntax errors to verify fail-safe error reporting. |

#### [NEW] [SecureVault.sol](file:///c:/Users/maitr/Downloads/cryptp/contracts/SecureVault.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SecureVault {
    uint256 public value;
    event ValueUpdated(address indexed user, uint256 newValue);

    function setValue(uint256 _v) public {
        value = _v;
        emit ValueUpdated(msg.sender, _v);
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
```

#### [NEW] [RiskyStore.sol](file:///c:/Users/maitr/Downloads/cryptp/contracts/RiskyStore.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // ISSUE: Floating Pragma

contract RiskyStore {
    uint256 public value;

    function setValue(uint256 _v) public {
        // ISSUE: Dangerous use of tx.origin
        require(tx.origin == msg.sender, "Only EOA");
        value = _v; // ISSUE: State change without Event
    }
}
```

---

## 🛠 Phase 2: Workspace Hierarchy & Persistence

Verifying that the IDE maintains state across refreshes and handles nested structures correctly.

1.  **Workspace Creation**: Create a new workspace: `DOM_Verification`.
2.  **Structure**:
    *   Create **Profile 1** and **Profile 2** in the root directory.
    *   Create a subfolder `VerificationSub`.
    *   Duplicate both contracts inside `VerificationSub`.
3.  **Persistence Cycle**:
    *   Compile all 4 contracts.
    *   Perform a hard refresh (**F5**).
    *   **Verify**: Explorer structure must remain intact; compiled artifacts (ABIs) should still be associated with the files.

---

## 🛠 Phase 3: Analytics & Forensic Verification

Ensuring the data visualization layer correctly interprets blockchain state.

### 📊 Radar Chart & Safety Scores
- [ ] **Verify**: Profile 1 displays a perfect pentagon/radar signature.
- [ ] **Verify**: Profile 2 shows clear indentations for "Best Practices" and "Security" metrics.

### 🌡️ Precision Gas Heatmap
- [ ] Open `SecureVault.sol`.
- [ ] **Verify**: Colored gutters (heatmap) highlight `setValue` (Storage Write) with higher intensity than `getValue` (View).

### 📈 Live Market Data
- [ ] **Verify**: ETH Price and Gas Price (Gwei) are fetching live data from Mainnet.
- [ ] **Verify**: Values are non-static and refresh every ~30 seconds.

---

## 🛠 Phase 4: Interaction & Blockchain State

1.  **Deployment**: Deploy `SecureVault` to the Sandbox.
2.  **Interaction Panel**:
    *   Navigate to the **Interaction** sidebar.
    *   Execute `setValue(123)`.
    *   Execute `getValue()` and confirm result is `123`.
3.  **Persistence**:
    *   Switch to a different file and come back.
    *   **Verify**: The Interaction Panel for the deployed contract remains populated and active.
4.  **Forensic Check**:
    *   Observe the **Block Number** in the Blockchain Visualization.
    *   **Verify**: Block number increments for each transaction (starting from base ~18M).

---

## 🛠 Phase 5: UI Cleanup & Deletion logic

1.  **File Deletion**: Delete one contract inside `VerificationSub`.
2.  **Subfolder Deletion**: Delete the `VerificationSub` folder entirely.
3.  **Workspace Deletion**: Delete the `DOM_Verification` workspace.
4.  **Final Check**: Ensure no orphan records remain in the sidebars or Interaction history.

---

## 🛠 Phase 6: Asset Factory & Token Logic (Deep Coverage)

Verifying the **Asset Factory** wizard and the efficiency of the **Security Hardening** logic across all possible combinations.

### 🧪 Logic Combination Matrix
Perform a "Spot Check" for each standard to ensure no regression in generation logic.

| Standard | Access | Logic Extensions | Expected Result |
| :--- | :--- | :--- | :--- |
| **ERC20** | Roles | Burnable + Pausable + Permit + Votes | 100% Score, Success |
| **ERC721** | Ownable | URI Storage + Enumerable + Burnable | ~85% Score (Alert: Ownable), Success |
| **ERC721A** | Roles | Batch Mint + Access Control | 100% Score, Success |
| **ERC1155** | Roles | Batch Mint + Supply + Pausable | 100% Score, Success |

### 🛠 Step-by-Step Verification
1.  **Standard Selection**:
    *   Open the Asset Factory.
    *   Choose each standard (**ERC20, ERC721, ERC721A, ERC1155**) sequentially.
    *   **Verify**: Standard icons and the Preview Card type-tag update accordingly.
2.  **Access Protocol & Scoring**:
    *   Switch to **Ownable**. 
    *   **Verify**: A warning appears: "Centralized Risk (-15 pts)".
    *   Switch to **Roles (RBAC)**.
    *   **Verify**: The "100 SCORE" indicator is achievable by fixing other parameters.
3.  **Preset Validation**:
    *   Test all 4 Presets: **DeFi Legend**, **Gaming Soul**, **DAO Core**, **Mass Mint NFT**.
    *   **Verify**: Each preset correctly toggles the required logical extensions (e.g., DAO Core must toggle "Votes" and "Permit").
4.  **Injection & Compilation**:
    *   For the **DAO Core** preset, click **Inject Implementation**.
    *   **Verify**: Injected code includes:
        - `MINTER_ROLE` and `PAUSER_ROLE` constants.
        - Custom events: `AssetMinted`, `ContractPaused`.
        - `_update` override with `ERC20Votes` signature.
    *   **Verify**: Compiler shows "Compilation Successful".

### 📊 Automated Batch Audit
- [ ] Run `npx tsx scratch/audit_templates.ts`.
- [ ] **Verify**: Console output shows `✅ PASS: 100/100` for all static and generated test cases.

---

## 📁 Evidence Collection Checklist

> [!TIP]
> Use these captures for the final walkthrough.

- [ ] **SS_01**: Radar Chart for `SecureVault` (100% Score).
- [ ] **SS_02**: Radar Chart for `RiskyStore` (Reduced Score + Alerts).
- [ ] **SS_03**: Gas Heatmap intensities in the editor.
- [ ] **SS_04**: Persistence of Interaction panel after browser refresh.
- [ ] **SS_05**: Folder hierarchy showing `VerificationSub`.
- [ ] **SS_06**: Asset Factory showing "100 SCORE" indicator for a Roles-based contract.
- [ ] **SS_07**: Successful compilation of an ERC721A contract injected via the factory.
