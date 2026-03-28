# Deployment Guide

## Complete Step-by-Step Token Deployment Tutorial

This guide walks you through deploying your ERC-20 token on an Ethereum testnet.

## Prerequisites

- ✅ Completed [Installation Guide](INSTALLATION.md)
- ✅ MetaMask installed and set up
- ✅ Testnet ETH in your MetaMask wallet
- ✅ Access to Remix IDE

## Step 1: Prepare Your Smart Contracts

### Option A: Copy from This Project

1. Open this project in your code editor
2. Navigate to the `contracts/` folder
3. You'll find the following files:
   - `MyToken.sol` - Your main token contract
   - `ERC20.sol` - Base ERC-20 implementation
   - `IERC20.sol` - ERC-20 interface
   - `IERC20Metadata.sol` - Metadata interface
   - `Context.sol` - Utility contract

## Step 2: Set Up Remix IDE

### Opening Remix

1. Go to [https://remix.ethereum.org](https://remix.ethereum.org)
2. You should see the Remix IDE interface
3. A default workspace with example files will be shown

### Creating a New Workspace

1. Look at the left sidebar, find "FILE EXPLORER"
2. Right-click in the empty space below any existing files
3. Select "New Folder"
4. Name it `CryptP`
5. Right-click on the folder
6. Select "New File"

### Adding Contract Files

Add the following files in order:

#### 1. Context.sol

File: `contracts/utils/Context.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}
```

#### 2. IERC20.sol

File: `contracts/IERC20.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
```

#### 3. IERC20Metadata.sol

File: `contracts/Extensions/IERC20Metadata.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IERC20.sol";

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}
```

#### 4. ERC20.sol

The full ERC-20 implementation from the `contracts/ERC20.sol` file.

#### 5. MyToken.sol

File: `contracts/MyToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
```

## Step 3: Compile Contracts

### Accessing the Compiler

1. On the left sidebar, click the **Solidity Compiler** icon (looks like a checkbox)
2. Look at the top of the panel

### Compile Settings

1. **Compiler Version**: Select `0.8.20` or higher
2. **Language**: Should be set to "Solidity"
3. **EVM Version**: Leave as default

### Compiling

1. Click **Compile MyToken.sol**
2. Wait for compilation to complete
3. You should see a green checkmark ✓ if successful
4. If there are errors, check the "Solidity Compiler" panel for details

### Troubleshooting Compilation

**Error: Can't find import**
- Ensure all contract files are in the correct folder structure
- Check file paths in import statements match your folder layout

**Error: Pragma version conflict**
- Ensure all files use `pragma solidity ^0.8.20;` or compatible version

## Step 4: Set Up MetaMask

### Install MetaMask

1. Go to [https://metamask.io/download/](https://metamask.io/download/)
2. Click "Install MetaMask for [Your Browser]"
3. Follow the browser extension installation prompts
4. Create or import your wallet
5. **IMPORTANT**: Save your seed phrase in a secure location

### Connect to Testnet

1. Click the MetaMask icon in your browser
2. Look for the network selector (top of the popup)
3. Click "Ethereum Mainnet" dropdown
4. Scroll down to "Add network"
5. Select one of these testnets:

**Sepolia (Recommended)**
- Network Name: Sepolia Testnet
- RPC URL: https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
- Chain ID: 11155111
- Currency: ETH

**Goerli**
- Network Name: Goerli Testnet
- RPC URL: https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
- Chain ID: 5
- Currency: ETH

### Get Testnet ETH

Once connected to your testnet, visit a faucet to get free test ETH:

- **Sepolia**: [sepoliafaucet.com](https://sepoliafaucet.com/)
- **Goerli**: [goerlifaucet.com](https://goerlifaucet.com/)

1. Go to the faucet website
2. Paste your MetaMask wallet address
3. Click "Send"
4. Wait a few moments
5. Check MetaMask - you should see ETH in your account

## Step 5: Deploy Your Contract

### Connect Remix to MetaMask

1. In Remix, click the **Deploy & Run Transactions** tab (looks like a rocket)
2. Look for the "ENVIRONMENT" dropdown
3. Select **"Injected Provider - MetaMask"**
4. MetaMask will appear asking for permission
5. Click "Connect" in MetaMask

### Deploy Settings

1. Make sure **ACCOUNT** shows your MetaMask address
2. Under "CONTRACT", select **MyToken**
3. No constructor parameters needed (they're set in the contract)

### Deploy Button

1. Click the blue **"Deploy"** button
2. MetaMask will show a transaction confirmation
3. Review the gas fees
4. Click **"Confirm"** in MetaMask
5. Wait for the transaction to complete
6. You'll see a green checkmark and your contract address

### Copy Your Contract Address

1. Look in the "Deployed Contracts" section
2. Find your MyToken contract
3. Click the copy icon next to the address
4. **Save this address** - you'll need it for MetaMask

## Step 6: View Your Tokens in MetaMask

### Add Token to MetaMask

1. Open MetaMask
2. Click the "Import tokens" link at the bottom
3. Paste your contract address
4. The token name (MTK) and decimals should auto-fill
5. Click **"Add Custom Token"**
6. Click **"Import Tokens"**

### Verify Your Balance

1. You should now see your token in MetaMask
2. Balance should show: **1,000,000 MTK**
3. You can now send these tokens to other addresses

## Step 7: Test Your Token (Optional)

### Send Tokens

1. Click on your token in MetaMask
2. Click "Send"
3. Enter a recipient address (try a different MetaMask account)
4. Enter amount (e.g., 1000 MTK)
5. Click "Next"
6. Review gas fees
7. Click "Confirm"
8. Transaction will be processed

### Verify on Block Explorer

1. Go to [testnet.etherscan.io](https://testnet.etherscan.io/) (or relevant testnet explorer)
2. Paste your contract address
3. Browse your contract details and transaction history

## Common Issues & Solutions

### MetaMask Not Showing

**Problem**: Remix can't connect to MetaMask

**Solution**:
- Refresh the Remix page
- Check MetaMask is unlocked
- Try a different browser (Chrome works best)
- Re-request permission from environment dropdown

### Compilation Fails

**Problem**: Can't compile contracts

**Solution**:
- Check all import paths are correct
- Ensure Solidity compiler version is 0.8.20+
- Check for typos in code
- Copy contracts directly from this project

### Deployment Fails

**Problem**: "Out of gas" or transaction rejected

**Solution**:
- Ensure you have testnet ETH in MetaMask
- Check your gas limit in MetaMask
- Reduce gas price if needed
- Try again in a few moments

### Token Not Appearing in MetaMask

**Problem**: Token doesn't show after import

**Solution**:
- Verify network is correct in MetaMask
- Copy address exactly (no extra spaces)
- Refresh MetaMask
- Try removing and re-adding token

## Next Steps

Once your token is deployed:

1. **Explore Your Token**: Interact with it using Remix functions
2. **Test Transfers**: Send tokens to different wallets
3. **Customize Further**: Modify the contract parameters
4. **Deploy to Mainnet**: When ready, deploy to Ethereum mainnet

See [CUSTOMIZATION.md](CUSTOMIZATION.md) for advanced token features.
