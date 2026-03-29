import React, { useState } from 'react';
import { CompilationResult } from '../utils/hardhatCompiler';
import { ethers, ContractFactory, getCreateAddress } from 'ethers';
import { SimulatedDeployment } from '../types';
import { AlertTriangle, CheckCircle, Copy, ChevronDown, ChevronUp, Zap, Rocket, Loader, FileCode, Database, DollarSign } from 'lucide-react';



interface CompileOutputProps {
  result: CompilationResult;
  code?: string;
  onDeployment?: (entry: SimulatedDeployment) => void;
}

const CompileOutput: React.FC<CompileOutputProps> = ({ result, onDeployment }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<SimulatedDeployment | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Check if MetaMask is available
  const isMetaMaskAvailable = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  const deployWithMetaMask = async () => {
    if (!result.abi || !result.bytecode) {
      setDeploymentError('ABI or bytecode missing');
      return;
    }

    // Check if MetaMask is available
    if (!isMetaMaskAvailable()) {
      setDeploymentError('MetaMask not detected. Please install MetaMask browser extension. Falling back to local simulation.');
      await deployLocalSimulation();
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);

    try {
      // Request account access - this should trigger MetaMask popup
      console.log('Requesting MetaMask account access...');
      if (!window.ethereum) throw new Error('MetaMask not found');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('MetaMask account access granted');
      
      // Use ethers v6 BrowserProvider
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const network = await provider.getNetwork();

      const requiredChainId = BigInt(11155111); // Sepolia
      if (network.chainId !== requiredChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }]
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }
              ]
            });
          } else {
            throw new Error('Please switch MetaMask to Sepolia testnet.');
          }
        }
      }


      const signer = await provider.getSigner();
      
      // Try the standard ContractFactory approach first (skip if hardcoded bytecode)
      let contractAddress = '';
      let receipt: any;

      
      if (!result.isHardcoded) {
        try {
          console.log('Attempting standard ContractFactory deployment...');
          const factory = new ContractFactory(result.abi as any, result.bytecode as string, signer);
          const deployment = await factory.deploy();
          const contract = await deployment.waitForDeployment();
          contractAddress = await contract.getAddress();
          
          // Get transaction receipt
          const deployTx = deployment.deploymentTransaction();
          if (deployTx && deployTx.hash) {
            receipt = await provider.waitForTransaction(deployTx.hash);
          } else {
            throw new Error('No transaction hash available');
          }
          console.log('Standard deployment successful');

        } catch (factoryError: any) {
          console.warn('Standard deployment failed, trying manual transaction approach:', factoryError.message);
          // Continue to manual deployment
        }
      }
      
      // Manual transaction deployment (always used for hardcoded bytecode)
      let finalContractAddress = contractAddress;
      if (!finalContractAddress) {

        console.log('Attempting manual transaction deployment...');
        
        // Create transaction data for deployment
        const deployData = result.bytecode;
        console.log('Deploy data length:', deployData?.length);
        
        // Estimate gas with a simple call first
        let gasLimit;
        try {
          gasLimit = await provider.estimateGas({
            data: deployData,
            from: await signer.getAddress()
          });
          console.log('Estimated gas:', gasLimit.toString());
          // Add some buffer
          gasLimit = gasLimit * BigInt(120) / BigInt(100);
        } catch (gasError) {
          console.warn('Gas estimation failed, using default:', gasError);
          // Use a very conservative gas limit for simple contracts
          gasLimit = BigInt(100000); // Much lower default gas limit
        }
        
        // Send the deployment transaction
        console.log('Sending deployment transaction...');
        console.log('Transaction data length:', deployData?.length);
        console.log('Gas limit:', gasLimit.toString());
        
        const txRequest = {
          data: deployData,
          gasLimit: gasLimit
        };
        console.log('Transaction request:', txRequest);
        
        const txResponse = await signer.sendTransaction(txRequest);
        console.log('Deployment transaction sent:', txResponse.hash);
        
        // Wait for the transaction to be mined
        receipt = await txResponse.wait();
        console.log('Transaction mined, getting contract address...');
        
        // Calculate contract address
        const deployerAddress = await signer.getAddress();
        const nonce = await provider.getTransactionCount(deployerAddress, 'latest');
        const calculatedAddress = getCreateAddress({
          from: deployerAddress,
          nonce: nonce - 1 // -1 because nonce was already incremented
        });
        
        console.log('Manual deployment successful');
        finalContractAddress = calculatedAddress;
      }


      const deployer = await signer.getAddress();
      const deploymentEntry: SimulatedDeployment = {
        contractAddress: finalContractAddress,

        transactionHash: receipt.hash,
        network: 'Sepolia',
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed),
        deployer,
        timestamp: new Date().toISOString(),
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        isRealChain: true
      };

      setDeploymentResult(deploymentEntry);
      onDeployment?.(deploymentEntry);
      console.log('Deployment successful, calling onDeployment:', deploymentEntry);
    } catch (error: any) {
      const message = error?.message || 'Deployment failed';
      setDeploymentError(message);

      // Always try local simulation as fallback
      console.log('MetaMask deployment failed, falling back to local simulation');
      await deployLocalSimulation();
    } finally {
      setIsDeploying(false);
    }
  };

  const deployLocalSimulation = async () => {
    if (!result.abi || !result.bytecode) return;

    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);

    try {
      console.log('Deploying to In-Browser EVM...');
      const { browserVM } = await import('../utils/browserVM');
      const deployResult = await browserVM.deployContract(result.bytecode);
      const blockNumber = await browserVM.getBlockNumber();

      const simulated: SimulatedDeployment = {
        contractAddress: deployResult.contractAddress,
        transactionHash: deployResult.transactionHash,
        network: 'Local Simulation',
        blockNumber: blockNumber,
        gasUsed: deployResult.gasUsed,
        deployer: '0x89f97Cb35236a1d0190FB25B31C5C0fF4107Ec1b',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        isRealChain: false
      };

      setDeploymentResult(simulated);
      onDeployment?.(simulated);
      console.log('Local simulation successful, calling onDeployment:', simulated);
    } catch (error: any) {
      setDeploymentError(error?.message || 'Local simulation failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const onDeployClick = async () => {
    await deployWithMetaMask();
  };

  const onDeployLocalClick = async () => {
    await deployLocalSimulation();
  };


  if (!result.success) {
    // Show errors for failed compilation
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-400">Compilation Failed</span>
          </div>
        </div>

        {/* Errors */}
        <div className="flex-1 overflow-y-auto text-sm p-3">
          {result.errors && result.errors.length > 0 && (
            <div className="space-y-2">
              {result.errors.map((error, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded text-xs font-mono ${
                    error.type === 'error'
                      ? 'bg-red-900/20 text-red-300 border border-red-700/50'
                      : 'bg-yellow-900/20 text-yellow-300 border border-yellow-700/50'
                  }`}
                >
                  <div className="font-bold mb-1">
                    {error.type === 'error' ? '❌' : '⚠️'} {error.type.toUpperCase()}
                  </div>
                  <div>{error.message}</div>
                  {error.sourceLocation && (
                    <div className="mt-1 text-gray-400">
                      Line {error.sourceLocation.start}-{error.sourceLocation.end} in {error.sourceLocation.file}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show deployment-ready information for successful compilation
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-green-500" />
          <span className="font-medium text-green-400">Contract Ready for Deployment</span>
          {result.isMockResult && (
            <span className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded">
              Syntax Validated
            </span>
          )}
        </div>
      </div>

      {/* Deployment Information */}
      <div className="flex-1 overflow-y-auto text-sm">
        {/* Contract Overview */}
        <div className="border-b border-gray-700">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full px-3 py-3 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
          >
            <span className="font-medium flex items-center gap-2">
              <FileCode className="h-4 w-4 text-blue-400" />
              Contract Overview
            </span>
            {expandedSections.has('overview') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.has('overview') && (
            <div className="p-3 bg-gray-900/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Contract Size</div>
                  <div className="text-sm font-mono text-green-300">
                    {result.contractSize ? `${result.contractSize} bytes` : 'N/A'}
                  </div>
                  {result.contractSize && result.contractSize > 24576 && (
                    <div className="text-xs text-red-400 mt-1">⚠️ Exceeds 24KB limit</div>
                  )}
                </div>
                <div className="bg-black/30 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Functions</div>
                  <div className="text-sm font-mono text-blue-300">
                    {result.abi?.filter((item: any) => item.type === 'function').length || 0} functions
                  </div>

                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-black/30 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Estimated Deployment Cost</div>
                  <div className="text-sm font-mono text-purple-300 flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    ~{result.gasEstimate ? (result.gasEstimate * 0.00000002).toFixed(4) : 'N/A'} ETH
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    @ 20 Gwei gas price
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Actions */}
        <div className="border-b border-gray-700">
          <div className="p-3 bg-gray-900/50">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-400" />
              Deployment Actions
            </h3>

            {!deploymentResult && !deploymentError && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onDeployLocalClick}
                    disabled={isDeploying}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded flex flex-col items-center justify-center transition shadow-lg shadow-indigo-900/20 group"
                  >
                    <div className="flex items-center gap-2 font-bold">
                       {isDeploying ? <Loader className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-yellow-400 group-hover:scale-110 transition" />}
                       Deploy to Local Sandbox
                    </div>
                    <span className="text-[10px] text-indigo-200 opacity-70">Zero-Install • Instant Execution</span>
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-800"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-600"><span className="bg-gray-950 px-2">OR</span></div>
                  </div>

                  <button
                    onClick={onDeployClick}
                    disabled={isDeploying || !isMetaMaskAvailable()}
                    className={`w-full px-4 py-2 rounded flex items-center justify-center gap-2 transition border ${
                      isMetaMaskAvailable() 
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20' 
                        : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Rocket className="h-4 w-4" />
                    <span className="text-xs font-semibold">Deploy to Sepolia (Testnet)</span>
                  </button>
                </div>

                {!isMetaMaskAvailable() && (
                  <div className="bg-orange-900/10 border border-orange-900/30 p-2 rounded flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-orange-300 font-bold">MetaMask Not Found</span>
                      <span className="text-[9px] text-gray-500">Testnet deployment requires an extension. 
                        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-orange-400 underline ml-1">Install MetaMask</a>
                      </span>
                    </div>
                  </div>
                )}
              </div>

            )}

            {deploymentResult && (
              <div className="space-y-3">
                <div className="p-3 bg-green-900/20 border border-green-700 rounded">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Deployment Successful!</span>
                  </div>
                  <div className="space-y-2 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contract Address:</span>
                      <span className="text-green-300 font-mono">{deploymentResult.contractAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transaction Hash:</span>
                      <span className="text-blue-300 font-mono">{deploymentResult.transactionHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Block Number:</span>
                      <span>{deploymentResult.blockNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gas Used:</span>
                      <span>{deploymentResult.gasUsed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 bg-black/20 p-2 rounded">
                  ✅ Contract deployed successfully! You can now interact with it at the address above.
                </div>
              </div>
            )}

            {deploymentError && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Deployment Failed</span>
                </div>
                <div className="text-xs text-red-300">{deploymentError}</div>
                <button
                  onClick={() => setDeploymentError(null)}
                  className="mt-2 text-xs px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contract Details */}
        <div className="border-b border-gray-700">
          <button
            onClick={() => toggleSection('details')}
            className="w-full px-3 py-3 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
          >
            <span className="font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-400" />
              Contract Details
            </span>
            {expandedSections.has('details') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.has('details') && (
            <div className="p-3 bg-gray-900/50 space-y-4">
              {/* ABI */}
              {result.abi && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400">Application Binary Interface (ABI)</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result.abi, null, 2))}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-gray-300 overflow-x-auto max-h-40 bg-black/30 p-2 rounded">
                    {JSON.stringify(result.abi, null, 2)}
                  </pre>
                </div>
              )}

              {/* Bytecode */}
              {result.bytecode && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400">Bytecode</span>
                    <button
                      onClick={() => copyToClipboard(result.bytecode || '')}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Length: {(result.bytecode || '').length} characters
                  </div>
                  <pre className="text-xs text-gray-300 overflow-x-auto max-h-40 bg-black/30 p-2 rounded break-all">
                    {result.bytecode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Browser Limitation Notice */}
        {result.isMockResult && (
          <div className="p-3 bg-blue-900/20 border-b border-gray-700">
            <p className="text-xs text-blue-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Syntax validated successfully! For real compilation and deployment, use Remix IDE or a Node.js environment.
            </p>
            <div className="mt-2 text-xs text-gray-400 bg-black/20 p-2 rounded">
              <p>🔍 <strong>Browser Limitation:</strong> Real Solidity compilation requires Node.js. This IDE provides syntax validation and deployment simulation.</p>
              <p className="mt-1">💡 <strong>Tip:</strong> Copy your code to <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Remix IDE</a> for full compilation and deployment.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompileOutput;