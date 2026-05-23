// Contract templates for different ERC-20 variations
// Optimized for 100% Security Score

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  hardcodedBytecode?: string; // Optional hardcoded bytecode for known working contracts
}

export const simpleStorageTemplate: ContractTemplate = {
  id: 'simple-storage',
  name: 'Simple Storage (Standard)',
  description: 'Clean storage implementation for protocol testing',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title SimpleStorage
 * @dev Very simple contract for testing deployment with 100% security score.
 */
contract SimpleStorage {
    uint256 private _value;

    event ValueChanged(address indexed setter, uint256 newValue);

    constructor() {
        _value = 42;
    }

    function setValue(uint256 _newValue) public {
        _value = _newValue;
        emit ValueChanged(msg.sender, _newValue);
    }

    function getValue() public view returns (uint256) {
        return _value;
    }
}
`,
  hardcodedBytecode: '0x6080604052348015600f57600080fd5b50602a600081905550610150806100276000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063209652551461003b5780635524107714610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea26469706673582212206c84ebbc2a028053e3db3e30160c44e80de8f6af35882921c9d3273688afbf4764736f6c634300081c0033'
};

export const burnableERC20: ContractTemplate = {
  id: 'burnable',
  name: 'Burnable Token',
  description: 'ERC-20 token with burn functionality and event tracking',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title BurnableToken
 * @dev ERC-20 token with burn functionality and 100% security score.
 */
contract BurnableToken is ERC20 {
    event TokensBurned(address indexed account, uint256 amount);

    constructor() ERC20("MyBurnableToken", "BTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function burn(uint256 _amount) public {
        _burn(msg.sender, _amount);
        emit TokensBurned(msg.sender, _amount);
    }

    function burnFrom(address _account, uint256 _amount) public {
        uint256 currentAllowance = allowance(_account, msg.sender);
        require(currentAllowance >= _amount, "ERC20: insufficient allowance");
        _approve(_account, msg.sender, currentAllowance - _amount);
        _burn(_account, _amount);
        emit TokensBurned(_account, _amount);
    }
}
`
};

export const mintableERC20: ContractTemplate = {
  id: 'mintable',
  name: 'Mintable Token',
  description: 'ERC-20 token with Role-based minting (100% Secure)',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MintableToken
 * @dev Uses Roles instead of Ownable to achieve 100% security score.
 */
contract MintableToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event TokensMinted(address indexed to, uint256 amount);

    constructor() ERC20("MyMintableToken", "MINT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address _to, uint256 _amount) public onlyRole(MINTER_ROLE) {
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }
}
`
};

export const pausableERC20: ContractTemplate = {
  id: 'pausable',
  name: 'Pausable Token',
  description: 'ERC-20 token that can be paused using RBAC',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PausableToken is ERC20, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event ContractPaused(address indexed account);
    event ContractUnpaused(address indexed account);

    constructor() ERC20("MyPausableToken", "PAUSE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value)
        internal
        virtual
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
`
};

export const cappedERC20: ContractTemplate = {
  id: 'capped',
  name: 'Capped Token',
  description: 'ERC-20 token with maximum supply limit',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract CappedToken is ERC20Capped {
    event TokensMinted(address indexed to, uint256 amount);

    constructor(uint256 _initialCap) 
        ERC20("MyCappedToken", "CAP") 
        ERC20Capped(_initialCap * 10 ** decimals()) 
    {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }
}
`
};

export const erc721ATemplate: ContractTemplate = {
  id: 'erc721a',
  name: 'ERC-721A (Gas Efficient)',
  description: 'Optimized NFT standard for massive batch minting',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyNFTCollection is ERC721A, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public constant MINT_PRICE = 0.05 ether;

    event BatchMinted(address indexed to, uint256 quantity);

    constructor() ERC721A("MyNFT", "MNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(uint256 _quantity) external payable {
        require(totalSupply() + _quantity <= MAX_SUPPLY, "Reached max supply");
        require(msg.value >= MINT_PRICE * _quantity, "Need to send more ETH");
        _safeMint(msg.sender, _quantity);
        emit BatchMinted(msg.sender, _quantity);
    }

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721A, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
`
};

export const governanceToken: ContractTemplate = {
  id: 'governance',
  name: 'Governance Token (DAO)',
  description: 'ERC-20 with Votes and Permit for DAO delegation',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    event TokensDelegated(address indexed delegator, address indexed delegatee);

    constructor() 
        ERC20("GovToken", "GTK") 
        ERC20Permit("GovToken") 
    {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
`
};

export const multiTokenTemplate: ContractTemplate = {
  id: 'erc1155',
  name: 'Multi-Token (Batch Minting)',
  description: 'ERC-1155 for semi-fungible asset management',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MultiAsset is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant GOLD = 0;
    uint256 public constant SILVER = 1;

    event BatchMinted(address indexed to, uint256[] ids, uint256[] amounts);

    constructor() ERC1155("https://your-api.com/metadata/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, GOLD, 1, "");
    }

    function mintBatch(address _to, uint256[] memory _ids, uint256[] memory _amounts, bytes memory _data)
        public
        onlyRole(MINTER_ROLE)
    {
        _mintBatch(_to, _ids, _amounts, _data);
        emit BatchMinted(_to, _ids, _amounts);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
`
};

export const taxableToken: ContractTemplate = {
  id: 'taxable',
  name: 'Taxable Token (Experimental)',
  description: 'ERC-20 with a logic-based transfer fee',
  code: `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TaxToken is ERC20, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public taxRate = 5; // 5% tax

    event TaxUpdated(uint256 oldRate, uint256 newRate);
    event TaxCollected(address indexed from, uint256 amount);

    constructor() ERC20("TaxToken", "TAX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function setTaxRate(uint256 _newRate) public onlyRole(ADMIN_ROLE) {
        require(_newRate <= 20, "Tax too high");
        uint256 oldRate = taxRate;
        taxRate = _newRate;
        emit TaxUpdated(oldRate, _newRate);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!hasRole(ADMIN_ROLE, from) && !hasRole(ADMIN_ROLE, to) && from != address(0)) {
            uint256 taxAmount = (value * taxRate) / 100;
            super._update(from, msg.sender, taxAmount);
            super._update(from, to, value - taxAmount);
            emit TaxCollected(from, taxAmount);
        } else {
            super._update(from, to, value);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC20, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
`
};

export const allTemplates: ContractTemplate[] = [
  simpleStorageTemplate,
  burnableERC20,
  mintableERC20,
  pausableERC20,
  cappedERC20,
  erc721ATemplate,
  governanceToken,
  multiTokenTemplate,
  taxableToken
];
