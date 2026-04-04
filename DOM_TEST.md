# CryptP IDE - End-to-End Functional Test (DOM Test)

This document outlines the protocol for verifying the core IDE features, including the **Interaction Panel Persistence** fix and the **Improved Deletion UI**.

## 🚀 Prerequisites
- **Email**: `codeemail001@gmail.com`
- **Password**: `Assassin@01`
- **Database**: Ensure the `abi` column has been added to `public.deployments`.

---

## 🛠 Phase 1: Workspace & Token Generation
1. **Login**: Authenticate with the credentials above.
2. **New Workspace**: Create a workspace named `Verification_Suite`.
3. **Asset Factory**:
   - Open the **Asset Factory** sidebar.
   - Set **Token Name**: `GoldToken`
   - Set **Symbol**: `GLD`
   - Click **Inject Implementation**.
4. **Verify**: Ensure `GoldToken.sol` (or a timestamped variant) appears in the Explorer.

## 🛠 Phase 2: Manual Contract Creation
1. **New File**: Click "New File" in the `Verification_Suite` workspace.
2. **Name**: `Vault.sol`
3. **Input Code**: Copy and paste the following into the editor:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function name() external view returns (string memory);
}

contract Vault {
    /**
     * @dev Checks the balance of a user for a specific token.
     */
    function checkBalance(address token, address user) public view returns (uint256) {
        return IERC20(token).balanceOf(user);
    }

    /**
     * @dev Simple string return to test Basic Call.
     */
    function vaultStatus() public pure returns (string memory) {
        return "Vault is Operational";
    }
}
```

---

## 🛠 Phase 3: Compilation & Deployment
1. **Compile Token**: Select `GoldToken.sol` and click **Compile & Refresh** in the Analytics sidebar.
2. **Deploy Token**: In the bottom panel, select `GoldToken` and click **Deploy to Sandbox**.
   - *Note the contract address.*
3. **Compile Vault**: Select `Vault.sol` and click **Compile & Refresh**.
4. **Deploy Vault**: Click **Deploy to Sandbox** for the Vault contract.

---

## 🛠 Phase 4: Interaction & Persistence Verification
1. **Active Interaction**: Go to the **Interaction** sidebar.
   - Verify `checkBalance` and `vaultStatus` are visible for the Vault.
2. **Switching Context**:
   - Go to **History**.
   - Find the `GoldToken` deployment.
   - Click **Interact with Contract**.
3. **CRITICAL CHECK**: Verify that the Interaction panel now populates with `name`, `symbol`, `balanceOf`, etc., for the GoldToken.
4. **Persistence Check**: Refresh the browser (F5), re-login, and repeat Step 2. The functions MUST still be there.

---

## 🛠 Phase 5: UI Cleanup (Deletion)
1. **File Deletion**: Hover over `Vault.sol` in the sidebar. Click the red **Trash icon**.
2. **Workspace Deletion**: Select the `Verification_Suite` workspace header. Click the red **Trash icon**.
3. **Verification**: Confirm that both are removed from the UI and backend successfully.
