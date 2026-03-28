// Contract templates for different ERC-20 variations

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const basicERC20: ContractTemplate = {
  id: 'basic',
  name: 'Basic ERC-20',
  description: 'Standard ERC-20 token with fixed supply',
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title MyToken
 * @dev Basic ERC-20 token with fixed supply
 */
contract MyToken is ERC20 {
    /**
     * @dev Constructor that gives initial supply to the deployer
     */
    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
`
};

export const burnableERC20: ContractTemplate = {
  id: 'burnable',
  name: 'Burnable Token',
  description: 'ERC-20 token with burn functionality',
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title BurnableToken
 * @dev ERC-20 token with burn functionality
 */
contract BurnableToken is ERC20 {
    /**
     * @dev Constructor that gives initial supply to the deployer
     */
    constructor() ERC20("MyBurnableToken", "BTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Burn tokens from your own address
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from another address (requires approval)
     * @param account The account to burn from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: insufficient allowance");
        approve(account, currentAllowance - amount);
        _burn(account, amount);
    }
}
`
};

export const mintableERC20: ContractTemplate = {
  id: 'mintable',
  name: 'Mintable Token',
  description: 'ERC-20 token where owner can mint new tokens',
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title MintableToken
 * @dev ERC-20 token with mint functionality
 */
contract MintableToken is ERC20 {
    address public owner;

    /**
     * @dev Constructor that gives initial supply to the deployer
     */
    constructor() ERC20("MyMintableToken", "MINT") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Only owner can call this function
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param account The account to mint to
     * @param amount The amount of tokens to mint
     */
    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
`
};

export const pausableERC20: ContractTemplate = {
  id: 'pausable',
  name: 'Pausable Token',
  description: 'ERC-20 token that can be paused by owner',
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title PausableToken
 * @dev ERC-20 token with pause/unpause functionality
 */
contract PausableToken is ERC20 {
    address public owner;
    bool public paused = false;

    event Paused(address indexed by, uint256 timestamp);
    event Unpaused(address indexed by, uint256 timestamp);

    /**
     * @dev Constructor that gives initial supply to the deployer
     */
    constructor() ERC20("MyPausableToken", "PAUSE") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Only owner can call this function
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    /**
     * @dev Only when not paused
     */
    modifier whenNotPaused() {
        require(!paused, "Token transfers are paused");
        _;
    }

    /**
     * @dev Pause all transfers
     */
    function pause() public onlyOwner {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }

    /**
     * @dev Unpause all transfers
     */
    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }

    /**
     * @dev Transfer tokens (paused check)
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }

    /**
     * @dev Transfer from (paused check)
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
}
`
};

export const cappedERC20: ContractTemplate = {
  id: 'capped',
  name: 'Capped Token',
  description: 'ERC-20 token with maximum supply limit',
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20.sol";

/**
 * @title CappedToken
 * @dev ERC-20 token with a maximum supply cap
 */
contract CappedToken is ERC20 {
    uint256 public immutable cap;

    /**
     * @dev Constructor that sets the token cap
     * @param initialCap The maximum supply of the token
     */
    constructor(uint256 initialCap) ERC20("MyCappedToken", "CAP") {
        require(initialCap > 0, "Cap must be greater than 0");
        cap = initialCap * 10 ** decimals();
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Mint new tokens (enforces cap)
     * @param account The account to mint to
     * @param amount The amount of tokens to mint
     */
    function mint(address account, uint256 amount) public {
        require(
            totalSupply() + amount <= cap,
            "ERC20Capped: cap exceeded"
        );
        _mint(account, amount);
    }

    /**
     * @dev View the remaining tokens that can be minted
     */
    function remainingSupply() public view returns (uint256) {
        return cap - totalSupply();
    }
}
`
};

export const allTemplates: ContractTemplate[] = [
  basicERC20,
  burnableERC20,
  mintableERC20,
  pausableERC20,
  cappedERC20
];
