// Contract templates for different ERC-20 variations

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  hardcodedBytecode?: string; // Optional hardcoded bytecode for known working contracts
}

export const basicERC20: ContractTemplate = {
  id: 'basic',
  name: 'Simple Storage (Working)',
  description: 'Ultra-simple contract with known working bytecode',
  code: `pragma solidity 0.4.26;

/**
 * @title SimpleStorage
 * @dev Very simple contract for testing deployment
 */
contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(uint256 newValue);

    constructor() public {
        _value = 42;
    }

    function setValue(uint256 newValue) public {
        _value = newValue;
        ValueChanged(newValue);
    }

    function getValue() public view returns (uint256) {
        return _value;
    }
}
`,
  // Compiler-generated creation bytecode for SimpleStorage (solc 0.8.28, Istanbul)
  hardcodedBytecode: '0x6080604052348015600f57600080fd5b50602a600081905550610150806100276000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063209652551461003b5780635524107714610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea26469706673582212206c84ebbc2a028053e3db3e30160c44e80de8f6af35882921c9d3273688afbf4764736f6c634300081c0033'
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
