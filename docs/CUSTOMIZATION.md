# Token Customization Guide

## Overview

This guide shows you how to customize your ERC-20 token by modifying the smart contracts before deployment.

## Customization Options

### 1. Token Basic Properties

#### Token Name and Symbol

The simplest customization - change what your token is called.

**File**: `contracts/MyToken.sol`

**Before**:
```solidity
constructor() ERC20("MyTokenName", "MTK") {
    _mint(msg.sender, 1000000 * 10 ** decimals());
}
```

**After (Example - Ethereum Token)**:
```solidity
constructor() ERC20("Ethereum Network Token", "ENT") {
    _mint(msg.sender, 1000000 * 10 ** decimals());
}
```

**Important**:
- Token name: Up to 30 characters recommended
- Symbol: 2-5 characters (uppercase recommended)
- Examples: BTC, ETH, USDC, SHIB, DOGE

#### Initial Supply

Change how many tokens are created at deployment.

**File**: `contracts/MyToken.sol`

**Format**: `amount * 10 ** decimals()`

**Examples**:

```solidity
// 1 million tokens
_mint(msg.sender, 1000000 * 10 ** decimals());

// 100 million tokens
_mint(msg.sender, 100000000 * 10 ** decimals());

// 1 billion tokens
_mint(msg.sender, 1000000000 * 10 ** decimals());

// 1 trillion tokens
_mint(msg.sender, 1000000000000 * 10 ** decimals());

// Decimal tokens (0.5 tokens)
_mint(msg.sender, 5 * 10 ** (decimals() - 1));
```

### 2. Owner Control

Add owner controls to manage the token after deployment.

**Add to MyToken.sol**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract MyToken is ERC20 {
    address public owner;

    constructor() ERC20("MyTokenName", "MTK") {
        owner = msg.sender;  // Set deployer as owner
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this!");
        _;
    }

    // Transfer ownership to a new address
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
```

### 3. Pause Functionality

Add ability to pause/unpause token transfers.

**Add to MyToken.sol**:

```solidity
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract MyToken is ERC20 {
    address public owner;
    bool public paused = false;

    event Paused(address indexed by, uint256 timestamp);
    event Unpaused(address indexed by, uint256 timestamp);

    constructor() ERC20("MyTokenName", "MTK") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Token transfers are paused");
        _;
    }

    function pause() public onlyOwner {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }

    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }

    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
}
```

### 4. Burn Functionality

Add ability to burn (permanently remove) tokens.

**Add to MyToken.sol**:

```solidity
contract MyToken is ERC20 {
    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Burn your own tokens
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // Burn tokens from another address (if approved)
    function burnFrom(address account, uint256 amount) public {
        uint256 decreasedAllowance = allowance(account, msg.sender) - amount;
        approve(account, decreasedAllowance);
        _burn(account, amount);
    }
}
```

### 5. Mintable Token

Add ability to mint new tokens after deployment.

**Add to MyToken.sol**:

```solidity
contract MyToken is ERC20 {
    address public owner;

    constructor() ERC20("MyTokenName", "MTK") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Mint new tokens
    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }
}
```

### 6. Capped Token

Implement maximum supply limit.

**Add to MyToken.sol**:

```solidity
contract MyToken is ERC20 {
    uint256 private constant MAX_SUPPLY = 2000000 * 10 ** 18; // 2 million max

    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address account, uint256 amount) public {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Exceeds maximum supply"
        );
        _mint(account, amount);
    }
}
```

### 7. Snapshot Feature

Create token snapshots for voting or distributions.

**Add to MyToken.sol**:

```solidity
contract MyToken is ERC20 {
    mapping(uint256 => mapping(address => uint256)) private _balancesAt;
    uint256 private _currentSnapshotId = 0;

    event Snapshot(uint256 indexed snapshotId);

    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function snapshot() public {
        _currentSnapshotId++;
        emit Snapshot(_currentSnapshotId);
    }

    function balanceOfAt(address account, uint256 snapshotId) 
        public 
        view 
        returns (uint256) 
    {
        return _balancesAt[snapshotId][account];
    }
}
```

## Complete Example: Full-Featured Token

Here's a complete custom token with multiple features:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

contract MyAdvancedToken is ERC20 {
    address public owner;
    bool public paused;
    uint256 public constant MAX_SUPPLY = 100000000 * 10 ** 18; // 100M

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EventPaused(address indexed by);
    event EventUnpaused(address indexed by);

    constructor() ERC20("Advanced Token", "ADV") {
        owner = msg.sender;
        _mint(msg.sender, 10000000 * 10 ** decimals()); // 10M initial
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Token is paused");
        _;
    }

    // Owner Management
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // Pause/Unpause
    function pause() public onlyOwner {
        paused = true;
        emit EventPaused(msg.sender);
    }

    function unpause() public onlyOwner {
        paused = false;
        emit EventUnpaused(msg.sender);
    }

    // Override transfer functions
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }

    // Minting with cap
    function mint(address account, uint256 amount) public onlyOwner {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Exceeds max supply"
        );
        _mint(account, amount);
    }

    // Burning
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // Check how much can still be minted
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
```

## Deployment Step-by-Step

1. **Modify YourToken.sol** with customizations above
2. **Copy modified code** to Remix
3. **Compile** in Remix (Solidity Compiler tab)
4. **Deploy** (Deploy & Run Transactions tab)
5. **Test** using Remix contract functions
6. **Verify** on block explorer (optional)

## Testing Your Customizations

### In Remix

1. Deploy contract
2. Under "Deployed Contracts", expand your token
3. Test each function:
   - `transfer()` - Send tokens
   - `pause()` / `unpause()` - Test pause feature
   - `mint()` - Mint new tokens
   - `burn()` - Burn tokens
   - `balanceOf()` - Check balance

### Verify on Block Explorer

1. Go to testnet block explorer
2. Search your contract address
3. View code and state
4. Verify no unexpected values

## Important Warnings ⚠️

- **Test on Testnet First**: Always test custom contracts on testnet before mainnet
- **Code Security**: Custom modifications may introduce vulnerabilities
- **Gas Costs**: Additional features increase deployment and transaction costs
- **Immutable After Deployment**: Can't change contract once deployed
- **Backup Code**: Save all contract code before deployment

## Common Modifications

| Feature | Complexity | Gas Cost | Use Case |
|---------|-----------|----------|----------|
| Basic Token | Low | Low | Simple token |
| Owner Control | Low | Low | Basic management |
| Pause/Unpause | Medium | Medium | Emergency stops |
| Burn | Low | Low | Token reduction |
| Mint | Medium | Medium | Supply increase |
| Cap | Low | Low | Max supply |
| Snapshot | High | High | Voting |

## Getting Help

- Check [CONTRACTS.md](CONTRACTS.md) for contract documentation
- Review [Solidity Docs](https://docs.soliditylang.org/)
- Test in Remix IDE before deployment
- Check GitHub issues for similar questions
