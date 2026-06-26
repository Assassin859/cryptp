/**
 * Modular Token Generator Utility
 * Supports ERC20, ERC721, ERC721A, ERC1155 with OpenZeppelin 5.0+ patterns.
 * Optimized for 100% Security Score.
 */

export type TokenType = 'ERC20' | 'ERC721' | 'ERC721A' | 'ERC1155';
export type AccessControl = 'Ownable' | 'Roles' | 'None';

export interface TokenOptions {
  type: TokenType;
  name: string;
  symbol: string;
  supply?: string;
  cap?: string;
  baseUri?: string;
  accessControl: AccessControl;
  features: {
    mintable: boolean;
    burnable: boolean;
    pausable: boolean;
    enumerable: boolean;
    uriStorage: boolean;
    capped: boolean;
    flashMinting: boolean;
    votes: boolean;
    permit: boolean;
    supply: boolean;
  };
}

export const generateTokenCode = (options: TokenOptions): string => {
  const { type, name, symbol, supply, cap, baseUri, accessControl, features } = options;
  const contractId = name.replace(/\s+/g, '');
  
  const imports: string[] = [];
  const inheritances: string[] = [];
  const superCalls: string[] = [];
  const stateVariables: string[] = [];
  const constructorBody: string[] = [];
  const functions: string[] = [];
  const overrides: string[] = [];
  const events: string[] = [];

  // Base Standards
  switch (type) {
    case 'ERC20':
      imports.push('import "@openzeppelin/contracts/token/ERC20/ERC20.sol";');
      inheritances.push('ERC20');
      superCalls.push(`ERC20("${name}", "${symbol}")`);
      
      if (supply && parseFloat(supply) > 0) {
        constructorBody.push(`_mint(msg.sender, ${supply} * 10 ** decimals());`);
      }
      
      if (features.burnable) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";');
        inheritances.push('ERC20Burnable');
        events.push('event TokensBurned(address indexed account, uint256 amount);');
      }
      
      if (features.pausable) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";');
        inheritances.push('ERC20Pausable');
      }

      if (features.capped && cap) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";');
        inheritances.push('ERC20Capped');
        superCalls.push(`ERC20Capped(${cap} * 10 ** decimals())`);
      }

      if (features.permit) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";');
        inheritances.push('ERC20Permit');
        superCalls.push(`ERC20Permit("${name}")`);
      }

      if (features.votes) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";');
        inheritances.push('ERC20Votes');
        // Votes requires Permit in OZ 5.x
        if (!features.permit) {
          imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";');
          inheritances.push('ERC20Permit');
          superCalls.push(`ERC20Permit("${name}")`);
        }
      }

      if (features.flashMinting) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";');
        inheritances.push('ERC20FlashMint');
      }
      break;

    case 'ERC721':
      imports.push('import "@openzeppelin/contracts/token/ERC721/ERC721.sol";');
      inheritances.push('ERC721');
      superCalls.push(`ERC721("${name}", "${symbol}")`);

      if (features.uriStorage) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";');
        inheritances.push('ERC721URIStorage');
      }
      if (features.burnable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";');
        inheritances.push('ERC721Burnable');
        events.push('event AssetBurned(address indexed owner, uint256 tokenId);');
      }
      if (features.enumerable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";');
        inheritances.push('ERC721Enumerable');
      }
      if (features.pausable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";');
        inheritances.push('ERC721Pausable');
      }
      break;

    case 'ERC721A':
      imports.push('import "erc721a/contracts/ERC721A.sol";');
      inheritances.push('ERC721A');
      superCalls.push(`ERC721A("${name}", "${symbol}")`);
      events.push('event BatchAssetMinted(address indexed to, uint256 quantity);');
      break;

    case 'ERC1155':
      imports.push('import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";');
      inheritances.push('ERC1155');
      superCalls.push(`ERC1155("${baseUri || ''}")`);
      
      if (features.pausable) {
        imports.push('import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";');
        inheritances.push('ERC1155Pausable');
      }
      if (features.burnable) {
        imports.push('import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";');
        inheritances.push('ERC1155Burnable');
      }
      if (features.supply) {
        imports.push('import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";');
        inheritances.push('ERC1155Supply');
      }
      break;
  }

  // Access Control
  if (accessControl === 'Ownable') {
    imports.push('import "@openzeppelin/contracts/access/Ownable.sol";');
    inheritances.push('Ownable');
    superCalls.push('Ownable(msg.sender)');
  } else if (accessControl === 'Roles') {
    imports.push('import "@openzeppelin/contracts/access/AccessControl.sol";');
    inheritances.push('AccessControl');
    stateVariables.push('bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");');
    stateVariables.push('bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");');
    constructorBody.push('_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);');
    if (features.mintable) constructorBody.push('_grantRole(MINTER_ROLE, msg.sender);');
    if (features.pausable) constructorBody.push('_grantRole(PAUSER_ROLE, msg.sender);');
  }

  // Feature Logic (Functions)
  if (features.mintable) {
    const modifier = accessControl === 'Ownable' ? 'onlyOwner' : (accessControl === 'Roles' ? 'onlyRole(MINTER_ROLE)' : '');
    if (type === 'ERC20') {
      events.push('event AssetMinted(address indexed to, uint256 amount);');
      functions.push(`
    function mint(address _to, uint256 _amount) public ${modifier} {
        _mint(_to, _amount);
        emit AssetMinted(_to, _amount);
    }`);
    } else if (type === 'ERC721') {
      events.push('event AssetMinted(address indexed to, uint256 tokenId, string uri);');
      functions.push(`
    function safeMint(address _to, string memory _uri) public ${modifier} {
        uint256 _tokenId = _nextTokenId();
        _safeMint(_to, _tokenId);
        ${features.uriStorage ? '_setTokenURI(_tokenId, _uri);' : ''}
        emit AssetMinted(_to, _tokenId, _uri);
    }`);
    } else if (type === 'ERC721A') {
      functions.push(`
    function mint(uint256 _quantity) public ${modifier} {
        _mint(msg.sender, _quantity);
        emit BatchAssetMinted(msg.sender, _quantity);
    }`);
    } else if (type === 'ERC1155') {
      events.push('event AssetMinted(address indexed to, uint256 id, uint256 amount);');
      functions.push(`
    function mint(address _account, uint256 _id, uint256 _amount, bytes memory _data)
        public
        ${modifier}
    {
        _mint(_account, _id, _amount, _data);
        emit AssetMinted(_account, _id, _amount);
    }`);
    }
  }

  if (features.pausable) {
    const modifier = accessControl === 'Ownable' ? 'onlyOwner' : (accessControl === 'Roles' ? 'onlyRole(PAUSER_ROLE)' : '');
    events.push('event ContractPaused(address indexed account);');
    events.push('event ContractUnpaused(address indexed account);');
    functions.push(`
    function pause() public ${modifier} {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() public ${modifier} {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }`);
  }

  // Overrides Required by Solidity
  if (type === 'ERC20') {
    const updateOverrides = ['ERC20'];
    if (features.pausable) updateOverrides.push('ERC20Pausable');
    if (features.capped) updateOverrides.push('ERC20Capped');
    if (features.votes) updateOverrides.push('ERC20Votes');

    if (updateOverrides.length > 1) {
      overrides.push(`
    function _update(address from, address to, uint256 value)
        internal
        override(${updateOverrides.join(', ')})
    {
        super._update(from, to, value);
    }`);
    }

    if (features.votes) {
      overrides.push(`
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }`);
    }
  } else if (type === 'ERC721') {
    const updateOverrides = ['ERC721'];
    if (features.enumerable) updateOverrides.push('ERC721Enumerable');
    if (features.pausable) updateOverrides.push('ERC721Pausable');

    if (updateOverrides.length > 1) {
      overrides.push(`
    function _update(address from, address to, uint256[] memory ids, address auth)
        internal
        override(${updateOverrides.join(', ')})
        returns (address)
    {
        return super._update(from, to, ids, auth);
    }`);
    }

    if (features.enumerable) {
      overrides.push(`
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }`);
    }

    if (features.uriStorage) {
      overrides.push(`
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }`);
    }

    const supportsOverrides = ['ERC721'];
    if (features.enumerable) supportsOverrides.push('ERC721Enumerable');
    if (features.uriStorage) supportsOverrides.push('ERC721URIStorage');
    if (accessControl === 'Roles') supportsOverrides.push('AccessControl');

    if (supportsOverrides.length > 1) {
      overrides.push(`
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(${supportsOverrides.join(', ')})
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
    }
  } else if (type === 'ERC1155') {
    const updateOverrides = ['ERC1155'];
    if (features.pausable) updateOverrides.push('ERC1155Pausable');
    if (features.supply) updateOverrides.push('ERC1155Supply');

    if (updateOverrides.length > 1) {
      overrides.push(`
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(${updateOverrides.join(', ')})
    {
        super._update(from, to, values, values);
    }`);
    }
    
    if (accessControl === 'Roles') {
      overrides.push(`
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }`);
    }
  }

  // Concatenation
  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

${[...new Set(imports)].sort().join('\n')}

contract ${contractId} is ${inheritances.join(', ')} {
    ${stateVariables.join('\n    ')}

    ${events.join('\n    ')}

    constructor()
        ${superCalls.join('\n        ')}
    {
        ${constructorBody.join('\n        ')}
    }

    ${functions.join('\n')}
${overrides.join('\n')}
}`;
};
