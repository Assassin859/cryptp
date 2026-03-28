import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode } from 'lucide-react';

interface ContractFile {
  name: string;
  path: string;
  description: string;
  language: string;
  lines: number;
  content: string;
}

const contractFiles: ContractFile[] = [
  {
    name: 'ERC20.sol',
    path: 'contracts/ERC20.sol',
    description: 'Base ERC-20 implementation with standard interface',
    language: 'Solidity',
    lines: 250,
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";
import "./IERC20Metadata.sol";
import "./utils/Context.sol";

/**
 * @dev Implementation of the {IERC20} interface.
 */
contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    // ... additional functions ...
}`
  },
  {
    name: 'IERC20.sol',
    path: 'contracts/IERC20.sol',
    description: 'ERC-20 token standard interface',
    language: 'Solidity',
    lines: 80,
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when \`value\` tokens are moved from one account (\`from\`) to another (\`to\`).
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a \`spender\` for an \`owner\` is set by a call to {approve}.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by \`account\`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves \`amount\` tokens from the caller's account to \`recipient\`
     */
    function transfer(address recipient, uint256 amount) external returns (bool);
}`
  },
  {
    name: 'IERC20Metadata.sol',
    path: 'contracts/Extensions/IERC20Metadata.sol',
    description: 'Optional metadata extension for ERC-20 tokens',
    language: 'Solidity',
    lines: 40,
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../IERC20.sol";

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}`
  },
  {
    name: 'Context.sol',
    path: 'contracts/utils/Context.sol',
    description: 'Utility contract providing sender context for transactions',
    language: 'Solidity',
    lines: 20,
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the sender of the transaction.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}`
  }
];

const ContractFileBrowser: React.FC = () => {
  const [expandedFile, setExpandedFile] = useState<string | null>('ERC20.sol');

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-400" />
          Base Contracts
        </h3>
        <p className="text-xs text-gray-400 mt-1">Referenced by your token contract</p>
      </div>

      <div className="overflow-y-auto flex-1">
        {contractFiles.map((file) => (
          <div
            key={file.name}
            className="border-b border-gray-800 last:border-b-0"
          >
            {/* File Header */}
            <button
              onClick={() => setExpandedFile(expandedFile === file.name ? null : file.name)}
              className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition flex items-start justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {expandedFile === file.name ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="font-mono font-semibold text-sm text-blue-400 truncate">
                    {file.name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 ml-6">{file.path}</p>
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {file.lines}L
              </span>
            </button>

            {/* File Content */}
            {expandedFile === file.name && (
              <div className="bg-gray-900/50 border-t border-gray-800 px-4 py-3">
                <p className="text-xs text-gray-400 mb-3">{file.description}</p>
                <div className="bg-gray-950 rounded border border-gray-800 p-3 overflow-x-auto">
                  <pre className="font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {file.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-xs text-gray-400">
        <p>
          💡 These files are imported by your contract. Include them when deploying on Remix.
        </p>
      </div>
    </div>
  );
};

export default ContractFileBrowser;
