import { Zap, Play, ShieldCheck, Rocket, Wallet, Globe, Check, ExternalLink, Terminal, BarChart3, Flame } from 'lucide-react';

interface DeploymentGuideProps {
  isSidebar?: boolean;
}

function DeploymentGuide({ isSidebar = false }: DeploymentGuideProps) {
  if (isSidebar) {
    return (
      <div className="flex flex-col gap-4 font-sans text-xs text-[#cccccc]">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">
            Deploy with CryptP
          </h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            From first line of Solidity to a live on-chain contract — entirely inside this browser.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-blue-400 mb-1.5 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Step 1: Write Your Contract
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>Use the <strong className="text-gray-300">Asset Factory</strong> (⚡ icon) to generate ERC-20, 721, or 1155 code in seconds</li>
              <li>Or write directly in the <strong className="text-gray-300">Monaco Editor</strong> — full Solidity syntax highlighting</li>
              <li>OpenZeppelin imports resolve automatically from CDN</li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-green-400 mb-1.5 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Step 2: Compile (Browser-Native)
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>Click the <strong className="text-gray-300">▶ Compile</strong> button in the editor toolbar</li>
              <li>The WASM Solc compiler runs instantly — no Node.js, no install</li>
              <li>Errors appear inline with exact line numbers</li>
            </ol>
          </div>

          {/* Step 3 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-purple-400 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Step 3: Security Audit
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>The <strong className="text-gray-300">Problem Audit</strong> tab auto-runs on every compile</li>
              <li>Check the <strong className="text-gray-300">Analytics</strong> panel (📊) for the Security Radar</li>
              <li>Fix any High/Medium findings before proceeding</li>
            </ol>
          </div>

          {/* Step 4 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> Step 4: Sandbox Simulation
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>In the <strong className="text-gray-300">Output</strong> tab, select <strong className="text-gray-300">Local Simulation</strong></li>
              <li>Click <strong className="text-gray-300">Deploy to Sandbox</strong> — no wallet needed</li>
              <li>A real EVM runs inside your browser via EthereumJS</li>
            </ol>
          </div>

          {/* Step 5 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-orange-400 mb-1.5 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Step 5: Interact & Profile Gas
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>Go to the <strong className="text-gray-300">Deployment</strong> tab (▶) to call your contract functions</li>
              <li>The <strong className="text-gray-300">Gas Profiler</strong> (🔥) shows line-by-line gas cost after each tx</li>
              <li>Optimize hot paths before going live</li>
            </ol>
          </div>

          {/* Step 6 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-yellow-400 mb-1.5 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Step 6: Promote to Live Network
            </h4>
            <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside pl-1">
              <li>Connect MetaMask using the wallet button in the header</li>
              <li>In the <strong className="text-gray-300">History</strong> tab, click <strong className="text-gray-300">Promote to Live Network</strong></li>
              <li>Confirm the transaction in MetaMask</li>
              <li>Get test ETH:
                <div className="flex flex-col gap-1 pl-4 mt-1">
                  <a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">Sepolia Faucet <ExternalLink className="h-2 w-2" /></a>
                  <a href="https://faucets.chain.link/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">Chainlink Faucet <ExternalLink className="h-2 w-2" /></a>
                </div>
              </li>
            </ol>
          </div>

          {/* Step 7 */}
          <div className="bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded-lg">
            <h4 className="font-bold text-blue-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Step 7: Verify on Etherscan
            </h4>
            <p className="text-[10px] text-gray-400 pl-1">
              Verify your source code on{' '}
              <a href="https://sepolia.etherscan.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                Etherscan <ExternalLink className="h-2 w-2" />
              </a>{' '}
              using the compiler version and settings from the Output panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full-page variant
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
          Deploy Smart Contracts with CryptP
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl">
          From first line of Solidity to a live on-chain contract — entirely inside your browser.
          No Node.js, no CLI, no Remix. Just write, compile, audit, and ship.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Step 1 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 1: Write Your Contract</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Open the <strong>Asset Factory</strong> (⚡ icon in the left sidebar) to generate ERC-20, ERC-721, ERC-721A, or ERC-1155 tokens with a click</li>
            <li className="pl-2">Or write directly in the <strong>Monaco Editor</strong> — the same engine that powers VS Code</li>
            <li className="pl-2">OpenZeppelin imports like <code className="bg-gray-800 px-1 rounded text-sm">@openzeppelin/contracts/...</code> resolve automatically from CDN</li>
            <li className="pl-2">Use the <strong>Global Search</strong> (🔍) to find symbols across all your workspaces</li>
          </ol>
        </div>

        {/* Step 2 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-green-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 2: Compile (WASM)</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Click the <strong>▶ Compile</strong> button in the editor toolbar</li>
            <li className="pl-2">CryptP runs the <strong>Solc WASM compiler</strong> directly in your browser — no backend, no install required</li>
            <li className="pl-2">The compiler auto-detects your <code className="bg-gray-800 px-1 rounded text-sm">pragma solidity</code> version and loads the correct Solc binary</li>
            <li className="pl-2">Errors appear in the <strong>Output</strong> panel with exact line numbers</li>
          </ol>
        </div>

        {/* Step 3 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-purple-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 3: Security Audit</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">After compiling, open the <strong>Problem Audit</strong> tab in the bottom panel</li>
            <li className="pl-2">CryptP runs <strong>15 AST-based security rules</strong> — reentrancy, tx.origin, overflow, selfdestruct, and more</li>
            <li className="pl-2">Check the <strong>Analytics</strong> sidebar (📊) for the Security Radar and Market Cost Projection</li>
            <li className="pl-2">Aim for a score of <strong>90+</strong> before deploying to mainnet</li>
          </ol>
        </div>

        {/* Step 4 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-cyan-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3">
              <Terminal className="h-6 w-6 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 4: Sandbox Simulation</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">In the <strong>Output</strong> tab, click <strong>Deploy to Sandbox</strong> — no MetaMask or wallet required</li>
            <li className="pl-2">A full <strong>EthereumJS VM</strong> runs inside your browser, simulating real on-chain behaviour</li>
            <li className="pl-2">Your deployed contract appears as a block in the <strong>History</strong> tab (⊞ icon)</li>
            <li className="pl-2">Real transaction hashes and gas costs are reported</li>
          </ol>
        </div>

        {/* Step 5 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-orange-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 5: Interact &amp; Profile Gas</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Switch to the <strong>Deployment</strong> tab (▶) — CryptP auto-generates a UI for every ABI function</li>
            <li className="pl-2">Call any read or write function and see emitted events in the live <strong>Event Log</strong></li>
            <li className="pl-2">After each tx, the <strong>Gas Profiler</strong> (🔥 sidebar) shows a line-by-line heatmap of where your gas went</li>
            <li className="pl-2">Optimize expensive lines before going live to save users real money</li>
          </ol>
        </div>

        {/* Step 6 */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl hover:shadow-yellow-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
              <Rocket className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold">Step 6: Promote to Live Network</h2>
          </div>
          <ol className="text-gray-300 space-y-3 list-decimal list-inside">
            <li className="pl-2">Click the <strong>Wallet</strong> button in the header to connect MetaMask</li>
            <li className="pl-2">In the <strong>History</strong> tab, click <strong>Promote to Live Network</strong> on your sandbox deployment</li>
            <li className="pl-2">CryptP uses your MetaMask signer to broadcast the transaction — supports Sepolia, Base, and Ethereum Mainnet</li>
            <li className="pl-2">Get testnet ETH:
              <ul className="list-disc list-inside pl-5 pt-2">
                <li><a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Sepolia Faucet <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://faucets.chain.link/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Chainlink Faucet <ExternalLink className="h-3 w-3" /></a></li>
              </ul>
            </li>
          </ol>
        </div>
      </div>

      {/* Step 7 — Verify */}
      <div className="mt-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
            <Globe className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold">Step 7: Verify on Etherscan (Optional but Recommended)</h2>
        </div>
        <ol className="text-gray-300 space-y-3 list-decimal list-inside">
          <li className="pl-2">Copy your deployed contract address from the History tab</li>
          <li className="pl-2">Go to <a href="https://sepolia.etherscan.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Sepolia Etherscan <ExternalLink className="h-3 w-3" /></a> (or the explorer for your chosen network)</li>
          <li className="pl-2">Search for your contract address → click <strong>Contract</strong> tab → <strong>Verify and Publish</strong></li>
          <li className="pl-2">Use the compiler version shown in the CryptP Output panel</li>
          <li className="pl-2">Paste the Solidity source. Verification unlocks the read/write UI on Etherscan for your users</li>
        </ol>
      </div>

      {/* Testing section */}
      <div className="mt-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 text-blue-400 mr-2" />
          Testing Your Contract
        </h2>
        <div className="space-y-4 text-gray-300">
          <p>Once deployed, use CryptP's built-in tools to test and monitor your contract:</p>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                <Play className="h-4 w-4" /> Using CryptP Interaction Tab
              </h3>
              <p className="mb-2">After deployment, switch to the <strong>Deployment</strong> tab (▶ icon). You can:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Check balances with <code className="bg-gray-800 px-1 rounded">balanceOf</code></li>
                <li>Transfer tokens with <code className="bg-gray-800 px-1 rounded">transfer</code></li>
                <li>Approve allowances with <code className="bg-gray-800 px-1 rounded">approve</code></li>
                <li>See every emitted event in the live <strong>Event Log</strong></li>
              </ul>
            </div>

            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-400 mb-2 flex items-center gap-2">
                <Flame className="h-4 w-4" /> Using the Gas Profiler
              </h3>
              <p className="mb-2">After executing a transaction, the Gas Profiler (🔥 icon) shows:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Line-by-line gas attribution heatmap</li>
                <li>Most expensive functions ranked by gas cost</li>
                <li>Call trace tree for cross-contract interactions</li>
                <li>Total gas with quality rating (Accurate / Partial)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeploymentGuide;
