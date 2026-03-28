import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface DeploymentExample {
  title: string;
  description: string;
  contractAddress: string;
  txHash: string;
  network: string;
  deployer: string;
  gasUsed: string;
  blockNumber: number;
  explorerUrl: string;
}

const EXAMPLE_DEPLOYMENTS: DeploymentExample[] = [
  {
    title: 'MyToken - Basic ERC-20',
    description: 'Standard token with fixed 1M supply deployed to Sepolia testnet',
    contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f42e0A',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    network: 'Sepolia Testnet',
    deployer: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    gasUsed: '542,891',
    blockNumber: 4892102,
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  {
    title: 'BurnableToken - With Burn Feature',
    description: 'Token that allows users to burn their own tokens, deployed to Goerli',
    contractAddress: '0x9876543210fedcba9876543210fedcba98765432',
    txHash: '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    network: 'Goerli Testnet',
    deployer: '0x5aAeb6053ba3EFa6cd03aba563D43F5D82E8FCaF',
    gasUsed: '627,145',
    blockNumber: 9823456,
    explorerUrl: 'https://goerli.etherscan.io'
  }
];

const DeploymentExample: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const deployment = EXAMPLE_DEPLOYMENTS[selectedExample];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="bg-gray-950 rounded-lg border border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <CheckCircle className="h-4 w-4 text-green-400" />
          Deployment Example
        </h3>

        {/* Deployment Selector */}
        <div className="flex gap-2 flex-wrap">
          {EXAMPLE_DEPLOYMENTS.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedExample(idx)}
              className={`text-xs px-3 py-1 rounded transition ${
                selectedExample === idx
                  ? 'bg-green-600/30 border border-green-500/50 text-green-400'
                  : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
        {/* Title & Description */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">{deployment.title}</h4>
          <p className="text-xs text-gray-400">{deployment.description}</p>
        </div>

        {/* Contract Address */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">Contract Address</p>
          <div className="flex items-center gap-2 bg-gray-900 p-3 rounded border border-gray-700">
            <code className="text-xs text-blue-400 flex-1 font-mono truncate">
              {deployment.contractAddress}
            </code>
            <button
              onClick={() => copyToClipboard(deployment.contractAddress)}
              className="p-1 hover:bg-gray-800 text-gray-400 hover:text-blue-400 rounded transition"
              title="Copy address"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {copiedAddress && (
            <p className="text-xs text-green-400 mt-1">✓ Copied!</p>
          )}
        </div>

        {/* Transaction Hash */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">Transaction Hash</p>
          <div className="flex items-center gap-2 bg-gray-900 p-3 rounded border border-gray-700">
            <code className="text-xs text-purple-400 flex-1 font-mono truncate">
              {deployment.txHash}
            </code>
            <a
              href={`${deployment.explorerUrl}/tx/${deployment.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:bg-gray-800 text-gray-400 hover:text-purple-400 rounded transition"
              title="View on block explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <p className="text-xs text-gray-500 mb-1">Network</p>
            <p className="text-sm font-mono text-gray-300">{deployment.network}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Gas Used</p>
            <p className="text-sm font-mono text-gray-300">{deployment.gasUsed}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Deployer</p>
            <p className="text-xs font-mono text-gray-300 truncate">
              {deployment.deployer.slice(0, 12)}...
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Block</p>
            <p className="text-sm font-mono text-gray-300">{deployment.blockNumber}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3 mt-4">
          <p className="text-xs font-semibold text-blue-400 mb-2">After Deployment:</p>
          <ul className="text-xs text-blue-300 space-y-1">
            <li>✓ Save your contract address</li>
            <li>✓ Add token to MetaMask to verify</li>
            <li>✓ View on block explorer (Etherscan)</li>
            <li>✓ Interact via contract address</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-xs text-gray-400">
        <p>
          📋 This shows what a successful deployment looks like. Your deployment will follow the same pattern.
        </p>
      </div>
    </div>
  );
};

export default DeploymentExample;
