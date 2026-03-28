import React, { useState } from 'react';
import { FileCode, Globe, Check, AlertTriangle } from 'lucide-react';
import SolidityEditor from './SolidityEditor';
import ContractFileBrowser from './ContractFileBrowser';
import DeploymentExample from './DeploymentExample';

const IDELayout: React.FC = () => {
  const [showRightPanel, setShowRightPanel] = useState<'editor' | 'contracts' | 'example'>('editor');
  return (
    <div className="h-screen flex bg-gray-900">
      {/* Left Side - Deployment Guide */}
      <div className="w-1/2 overflow-y-auto border-r border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="p-6 md:p-8">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
              ERC-20 Token Guide
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl">
              Learn the deployment process, then use the code editor on the right to compile your contract.
            </p>
          </header>

          <div className="space-y-6">
            {/* Step 0: Choose Template */}
            <div className="bg-indigo-900/30 backdrop-blur-sm p-4 rounded-lg border border-indigo-700/50 hover:shadow-indigo-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
                  <FileCode className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 0: Choose Contract Type</h2>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Select a template above to start with different token capabilities:
              </p>
              <ul className="text-gray-300 text-sm space-y-2 ml-2">
                <li><strong className="text-blue-400">Basic</strong> - Standard ERC-20 with fixed supply</li>
                <li><strong className="text-green-400">Burnable</strong> - Users can burn their own tokens</li>
                <li><strong className="text-purple-400">Mintable</strong> - Owner can create new tokens</li>
                <li><strong className="text-yellow-400">Pausable</strong> - Owner can pause all transfers</li>
                <li><strong className="text-cyan-400">Capped</strong> - Maximum supply limit enforced</li>
              </ul>
            </div>

            {/* Step 1 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                  <FileCode className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 1: Understand Solidity</h2>
              </div>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
                <li>ERC-20 is the Ethereum token standard</li>
                <li>Your contract inherits from ERC20 base contract</li>
                <li>The constructor creates the initial token supply</li>
                <li>Edit the code on the right to customize your token</li>
              </ol>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 2: Compile & Check</h2>
              </div>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
                <li>Click "Compile" button to check for errors</li>
                <li>Fix any syntax errors shown</li>
                <li>ABI and Bytecode generate on success</li>
                <li>Copy them for deployment</li>
              </ol>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3">
                  <FileCode className="h-5 w-5 text-cyan-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 3: Copy Base Contracts</h2>
              </div>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
                <li>Click the <strong>📁 Base Contracts</strong> tab on the right</li>
                <li>View the base contracts (ERC20.sol, IERC20.sol, etc.)</li>
                <li>Copy each contract file to Remix:</li>
                <li className="ml-6">Create files with same names/paths in Remix</li>
                <li className="ml-6">Paste the contract code</li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Wallet className="h-5 w-5 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 4: Deploy on Remix</h2>
              </div>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
                <li>Go to <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Remix IDE</a></li>
                <li>Create new contract file with your code</li>
                <li>Add all base contract files (see step 3)</li>
                <li>Compile and deploy to testnet</li>
              </ol>
            </div>

            {/* Step 5 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
                  <Globe className="h-5 w-5 text-yellow-400" />
                </div>
                <h2 className="text-lg font-semibold">Step 5: Test Your Token</h2>
              </div>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
                <li>Install <a href="https://metamask.io" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">MetaMask</a> wallet</li>
                <li>Connect to testnet (Sepolia or Goerli)</li>
                <li>Get testnet ETH:
                  <ul className="ml-6 mt-1 space-y-1">
                    <li><a href="https://faucets.chain.link/sepolia" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Sepolia Faucet</a></li>
                    <li><a href="https://goerlifaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Goerli Faucet</a></li>
                  </ul>
                </li>
                <li>Add your deployed token address to MetaMask</li>
                <li>Test transfers and approvals</li>
              </ol>
            </div>

            {/* Tips */}
            <div className="bg-orange-900/20 border border-orange-700/50 p-4 rounded-lg">
              <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Important Tips
              </h3>
              <ul className="text-orange-300 text-sm space-y-1">
                <li>✓ Always test on testnet first</li>
                <li>✓ Never share your private keys</li>
                <li>✓ Save your contract address after deployment</li>
                <li>✓ Gas fees apply on mainnet</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Main Content Area */}
      <div className="w-1/2 flex flex-col min-w-0 bg-gray-900 border-l border-gray-700">
        {/* Top Bar with Wallet and Tabs */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowRightPanel('editor')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                showRightPanel === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Code Editor
            </button>
            <button
              onClick={() => setShowRightPanel('contracts')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                showRightPanel === 'contracts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📁 Base Contracts
            </button>
            <button
              onClick={() => setShowRightPanel('example')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                showRightPanel === 'example'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✅ Deployment Example
            </button>
          </div>
          {/* Wallet connect temporarily disabled */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {showRightPanel === 'editor' && <SolidityEditor />}
          {showRightPanel === 'contracts' && <ContractFileBrowser />}
          {showRightPanel === 'example' && <DeploymentExample />}
        </div>
      </div>
    </div>
  );
};

export default IDELayout;
