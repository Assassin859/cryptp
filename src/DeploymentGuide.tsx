import React from 'react';
import { ChevronRight, Wallet, FileCode, Globe, Check, AlertTriangle, ExternalLink } from 'lucide-react';

function DeploymentGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
          ERC-20 Token Deployment Guide
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl">
          Follow this step-by-step guide to deploy your "MyTokenName" (MTK) token on Ethereum using Remix IDE
          and test it with MetaMask.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
              <FileCode className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 1: Remix Setup</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Go to <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Remix IDE <ExternalLink className="h-3 w-3" /></a></li>
            <li className="pl-2">Create a new workspace (click the "+" icon)</li>
            <li className="pl-2">Create all the Solidity files (.sol) from the contracts folder</li>
            <li className="pl-2">Ensure the file structure matches the one in this project</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 2: Compile the Contract</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Go to the "Solidity Compiler" tab on the left sidebar</li>
            <li className="pl-2">Select compiler version 0.8.20 or higher</li>
            <li className="pl-2">Click "Compile MyToken.sol"</li>
            <li className="pl-2">Check for any errors in the console</li>
            <li className="pl-2">If successful, you'll see a green checkmark</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 3: MetaMask Setup</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Install <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">MetaMask <ExternalLink className="h-3 w-3" /></a> if you haven't already</li>
            <li className="pl-2">Connect to a testnet (e.g., Goerli or Sepolia)</li>
            <li className="pl-2">Get some testnet ETH from a faucet:
              <ul className="list-disc list-inside pl-5 pt-2">
                <li><a href="https://goerlifaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Goerli Faucet <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Sepolia Faucet <ExternalLink className="h-3 w-3" /></a></li>
              </ul>
            </li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
              <Globe className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 4: Deploy Contract</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Go to the "Deploy & Run Transactions" tab in Remix</li>
            <li className="pl-2">Set "Environment" to "Injected Provider - MetaMask"</li>
            <li className="pl-2">This will connect to your MetaMask wallet</li>
            <li className="pl-2">Select the MyToken contract from the dropdown menu</li>
            <li className="pl-2">Click "Deploy" and confirm the transaction in MetaMask</li>
            <li className="pl-2">Wait for the transaction to be confirmed</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
              <Wallet className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 5: Add Token to MetaMask</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Copy your deployed token address from Remix</li>
            <li className="pl-2">Open MetaMask and click "Import tokens" at the bottom</li>
            <li className="pl-2">Paste the token contract address</li>
            <li className="pl-2">The token symbol (MTK) and decimals (18) should auto-fill</li>
            <li className="pl-2">Click "Add Custom Token" and then "Import Tokens"</li>
            <li className="pl-2">You should now see your 1,000,000 MTK tokens in your wallet</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 6: Verify on Etherscan (Optional)</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Go to <a href="https://goerli.etherscan.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Goerli Etherscan <ExternalLink className="h-3 w-3" /></a> (or the explorer for your chosen testnet)</li>
            <li className="pl-2">Search for your contract address</li>
            <li className="pl-2">Click on the "Contract" tab</li>
            <li className="pl-2">Click "Verify and Publish"</li>
            <li className="pl-2">Select the compiler version and optimization you used in Remix</li>
            <li className="pl-2">Upload all contract files or paste their content</li>
            <li className="pl-2">Click "Verify and Publish"</li>
          </ol>
        </div>
      </div>

      <div className="mt-12 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <ChevronRight className="h-5 w-5 text-blue-400 mr-2" />
          Testing Your Token
        </h2>
        <div className="space-y-4 text-gray-300">
          <p>Once your token is deployed, you can test its functionality using the following methods:</p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-400 mb-2">Using Remix</h3>
              <p>After deployment, your contract appears under "Deployed Contracts" in Remix. You can:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Check your balance with <code className="bg-gray-800 px-1 rounded">balanceOf</code></li>
                <li>Transfer tokens with <code className="bg-gray-800 px-1 rounded">transfer</code></li>
                <li>Approve others to spend tokens with <code className="bg-gray-800 px-1 rounded">approve</code></li>
              </ul>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-400 mb-2">Using MetaMask</h3>
              <p>With your token in MetaMask, you can:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Send tokens to another address</li>
                <li>View your token balance</li>
                <li>Track token transactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeploymentGuide;