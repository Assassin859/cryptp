# Smart Contracts Documentation

## Overview

This project contains a production-ready ERC-20 token implementation based on the OpenZeppelin standard. The smart contracts are written in Solidity and designed to be secure, efficient, and fully compliant with the ERC-20 token standard.

## Contract Architecture

### File Structure

```
contracts/
├── MyToken.sol                 # Main token contract
├── ERC20.sol                   # ERC-20 implementation
├── IERC20.sol                  # ERC-20 interface
├── Extensions/
│   └── IERC20Metadata.sol      # Token metadata interface
└── utils/
    └── Context.sol              # Utility for msg.sender
```

## Contract Details

### 1. MyToken.sol

**Purpose**: The main contract to deploy

**Code**:
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

**Key Features**:
- Inherits from ERC20 contract
- Constructor sets token name and symbol
- Mints initial supply to deployer's address
- Initial supply: 1,000,000 tokens
- Decimals: 18 (standard for ERC-20)

**Constructor Parameters**:
- Name: "MyTokenName" (customize as needed)
- Symbol: "MTK" (customize as needed)
- Supply: 1,000,000 (multiply by 10^18 for actual amount)

### 2. ERC20.sol

**Purpose**: Implements the full ERC-20 standard

**Main Functions**:

#### View Functions (Read-Only)

```solidity
// Returns the total supply of tokens
totalSupply() → uint256

// Returns the balance of a specific account
balanceOf(address account) → uint256

// Returns allowance from owner to spender
allowance(address owner, address spender) → uint256

// Returns token name
name() → string

// Returns token symbol
symbol() → string

// Returns number of decimals
decimals() → uint8
```

#### State-Changing Functions

```solidity
// Transfer tokens from sender to recipient
transfer(address to, uint256 amount) → bool

// Approve spender to spend your tokens
approve(address spender, uint256 amount) → bool

// Transfer tokens from one address to another
// (must be approved first)
transferFrom(address from, address to, uint256 amount) → bool

// Increase allowance for spender
increaseAllowance(address spender, uint256 addedValue) → bool

// Decrease allowance for spender
decreaseAllowance(address spender, uint256 subtractedValue) → bool
```

**Events**:

```solidity
// Emitted when tokens are transferred
event Transfer(address indexed from, address indexed to, uint256 value)

// Emitted when approval is granted
event Approval(address indexed owner, address indexed spender, uint256 value)
```

### 3. IERC20.sol

**Purpose**: Defines the ERC-20 interface

**Includes**:
- All required function signatures
- All required events
- Standard token interface that other contracts can interact with

### 4. IERC20Metadata.sol

**Purpose**: Extends ERC-20 with metadata functions

**Functions**:
```solidity
function name() external view returns (string memory)
function symbol() external view returns (string memory)
function decimals() external view returns (uint8)
```

### 5. Context.sol

**Purpose**: Utility contract for accessing message context

**Functions**:
```solidity
// Returns the address of the caller
_msgSender() → address

// Returns the call data
_msgData() → bytes
```

## Using the Contracts

### Basic Token Operations

#### Transfer Tokens

```javascript
// In Remix, after deployment:
// 1. Find deployed contract under "Deployed Contracts"
// 2. Expand MyToken
// 3. Use transfer function
// 4. Recipient address: 0x...
// 5. Amount: 100 (will be 100 * 10^18 tokens)
// 6. Click transact
```

#### Check Balance

```javascript
// In Remix:
// 1. Use balanceOf function
// 2. Address: 0x...
// 3. Returns balance in smallest units (wei)
// 4. Divide by 10^18 to get readable amount
```

#### Approve Spending

```javascript
// Allow another address to spend your tokens
// 1. Use approve function
// 2. Spender: 0x...
// 3. Amount: 1000
// 4. Click transact
```

## Security Considerations

### ✅ Security Features

- **OpenZeppelin Standard**: Uses battle-tested OpenZeppelin code
- **ERC-20 Compliant**: Fully compliant with ERC-20 standard
- **Audited Code**: Code patterns are widely audited

### ⚠️ Important Notes

- No built-in owner controls (by design)
- No pause mechanism
- No burn function (standard ERC-20)
- No minting after deployment
- Supply is fixed at deployment

### 🔒 Best Practices

1. **Test on Testnet First**
   ```bash
   # Deploy to Sepolia or Goerli before mainnet
   ```

2. **Verify Addresses**
   - Always verify contract addresses
   - Use block explorers to confirm

3. **Protect Private Keys**
   - Never share your private key
   - Never commit .env files with secrets
   - Use hardware wallets for mainnet

## Customization

### Changing Token Parameters

To create your own custom token:

#### 1. Edit MyToken.sol

```solidity
constructor() ERC20("Your Token Name", "YTK") {
    _mint(msg.sender, 1000000 * 10 ** decimals());
}
```

**Changes**:
- Replace "Your Token Name" with your token name (max 30 chars)
- Replace "YTK" with your symbol (max 5 chars)
- Adjust 1000000 to your desired supply

#### 2. Recompile

```bash
# In Remix, recompile the MyToken.sol
```

#### 3. Redeploy

```bash
# Deploy the new contract to testnet
```

### Custom Supply

```solidity
// For 50 million tokens
_mint(msg.sender, 50000000 * 10 ** decimals());

// For 1 billion tokens
_mint(msg.sender, 1000000000 * 10 ** decimals());

// For 100 tokens
_mint(msg.sender, 100 * 10 ** decimals());
```

## Advanced Customization

### Adding Burn Function

```solidity
function burn(uint256 amount) public {
    _burn(msg.sender, amount);
}
```

### Adding Owner Control

```solidity
address public owner;

constructor() ERC20("MyTokenName", "MTK") {
    owner = msg.sender;
    _mint(msg.sender, 1000000 * 10 ** decimals());
}

modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
}
```

### Adding Pause Function

```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Token is paused");
    _;
}

function pause() public onlyOwner {
    paused = true;
}

function unpause() public onlyOwner {
    paused = false;
}
```

## Testing & Verification

### Remix Testing

1. Deploy contract to testnet
2. Use Remix functions to:
   - Check total supply
   - Check your balance
   - Transfer tokens
   - Approve spending
   - Test from different accounts

### Block Explorer Verification

1. Go to [etherscan.io](https://etherscan.io/) (mainnet) or testnet explorer
2. Paste your contract address
3. View:
   - Contract code
   - All transactions
   - Token holders
   - Transfer history

## Common Questions

**Q: Can I change the token supply after deployment?**
A: No, the initial supply is set at deployment and cannot be changed.

**Q: Can I add mint/burn functionality?**
A: Yes, you must add these functions before deployment (see Advanced Customization).

**Q: What happens if I deploy to the wrong network?**
A: The contract will exist on that network. You'll need to redeploy to the correct network.

**Q: Can I recover tokens sent to the wrong address?**
A: No, tokens sent to wrong addresses are permanently lost. Always verify addresses.

**Q: Is this contract secure?**
A: The code follows ERC-20 standard best practices. However, always test thoroughly on testnet first.

## Resources

- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [OpenZeppelin ERC-20](https://docs.openzeppelin.com/contracts/4.x/erc20)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Ethereum Gas Guide](https://ethereum.org/en/developers/docs/gas/)
