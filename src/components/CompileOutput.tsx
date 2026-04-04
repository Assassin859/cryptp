import React, { useState } from 'react';
import { CompilationResult } from '../utils/hardhatCompiler';
import { ethers, ContractFactory } from 'ethers';
import { SimulatedDeployment } from '../types';
import { 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Rocket, 
  Loader, 
  FileCode, 
  Database, 
  Wallet 
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';

interface CompileOutputProps {
  result: CompilationResult;
  code?: string;
  onDeployment?: (entry: SimulatedDeployment) => void;
}

const CompileOutput: React.FC<CompileOutputProps> = ({ result, onDeployment }) => {
  const { account, networkName, isConnected, connect } = useWeb3();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<SimulatedDeployment | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [executionEnv, setExecutionEnv] = useState<'sandbox' | 'injected'>('sandbox');

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

  const isMetaMaskAvailable = () => {
    return typeof window !== 'undefined' && (window as any).ethereum;
  };

  const deployWithMetaMask = async () => {
    if (!result.abi || !result.bytecode) {
      setDeploymentError('ABI or bytecode missing');
      return;
    }

    if (!isMetaMaskAvailable()) {
      setDeploymentError('MetaMask not detected.');
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const factory = new ContractFactory(result.abi as any, result.bytecode as string, signer);
      const deployment = await factory.deploy();
      const contract = await deployment.waitForDeployment();
      const contractAddress = await contract.getAddress();
      
      const deployTx = deployment.deploymentTransaction();
      const receipt = deployTx ? await provider.waitForTransaction(deployTx.hash) : null;

      const deploymentEntry: SimulatedDeployment = {
        contractAddress,
        transactionHash: receipt?.hash || '',
        network: networkName || 'Injected Network',
        blockNumber: receipt?.blockNumber || 0,
        gasUsed: receipt ? Number(receipt.gasUsed) : 0,
        deployer: account || '',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        isRealChain: true
      };

      setDeploymentResult(deploymentEntry);
      onDeployment?.(deploymentEntry);
    } catch (error: any) {
      setDeploymentError(error?.message || 'Deployment failed');
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
    } catch (error: any) {
      setDeploymentError(error?.message || 'Local simulation failed');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!result.success) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
        <div className="bg-[#252526] border-b border-[#2d2d2d] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Compilation Failed</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {result.errors?.map((error: any, idx: number) => (
            <div key={idx} className="p-3 rounded bg-red-900/10 border border-red-700/30 text-[11px] font-mono text-red-300">
              {error.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="bg-[#252526] border-b border-[#2d2d2d] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-green-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Contract Ready</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Overview */}
        <div className="border-b border-[#2d2d2d]">
          <button onClick={() => toggleSection('overview')} className="w-full px-4 py-3 bg-[#252526]/30 hover:bg-[#2d2d2d] text-[#cccccc] flex items-center justify-between transition-colors">
            <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-blue-400" /> Contract Info
            </span>
            {expandedSections.has('overview') ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          
          {expandedSections.has('overview') && (
            <div className="p-4 grid grid-cols-2 gap-3 bg-[#1a1a1a]">
              <div className="bg-[#252526] p-3 rounded border border-[#333]">
                <div className="text-[9px] uppercase font-black text-gray-500 mb-1">Contract Size</div>
                <div className="text-xs font-mono text-green-400">{result.contractSize || '0'} bytes</div>
              </div>
              <div className="bg-[#252526] p-3 rounded border border-[#333]">
                <div className="text-[9px] uppercase font-black text-gray-500 mb-1">Functions</div>
                <div className="text-xs font-mono text-blue-400">{result.abi?.filter((i: any) => i.type === 'function').length || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Deployment Section */}
        <div className="p-4 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gray-500 mb-1.5 block tracking-widest">Execution Environment</label>
              <div className="relative group">
                <select 
                  value={executionEnv}
                  onChange={(e) => setExecutionEnv(e.target.value as any)}
                  className="w-full bg-[#252526] border border-[#333] hover:border-[#007acc] text-[11px] font-bold text-[#cccccc] px-3 py-2.5 rounded appearance-none transition-all cursor-pointer outline-none shadow-inner"
                >
                  <option value="sandbox">CryptP Sandbox (Browser VM)</option>
                  <option value="injected">Injected Provider (MetaMask)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Actions */}
            {!deploymentResult && !deploymentError && (
              <div className="space-y-3 pt-2">
                {executionEnv === 'injected' && !isConnected ? (
                  <button
                    onClick={connect}
                    className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <Wallet className="size-4" /> Connect Wallet to Deploy
                  </button>
                ) : (
                  <button
                    onClick={executionEnv === 'sandbox' ? deployLocalSimulation : deployWithMetaMask}
                    disabled={isDeploying}
                    className={`w-full px-4 py-3 rounded font-bold text-xs flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group ${
                      executionEnv === 'sandbox' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#007acc] hover:bg-[#0062a3]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDeploying ? <Loader className="size-4 animate-spin text-white" /> : <Rocket className="size-4 text-white group-hover:scale-110 transition-transform" />}
                      <span>{executionEnv === 'sandbox' ? 'Deploy to Sandbox' : `Deploy to ${networkName || 'Network'}`}</span>
                    </div>
                    <span className="text-[9px] opacity-60 font-medium mt-0.5">
                      {executionEnv === 'sandbox' ? 'Instant • No Gas Required' : `Account: ${account?.slice(0, 10)}...`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {deploymentError && (
              <div className="p-3 bg-red-900/20 border border-red-700/30 rounded">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase">Deployment Failed</span>
                </div>
                <div className="text-[11px] text-red-300 font-mono mb-2 break-words">{deploymentError}</div>
                <button onClick={() => setDeploymentError(null)} className="text-[10px] px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded">Dismiss</button>
              </div>
            )}

            {/* Success Message */}
            {deploymentResult && (
              <div className="p-4 bg-green-900/10 border border-green-700/30 rounded space-y-3">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <CheckCircle className="size-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Deployment Successful</span>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-gray-500">Contract Address</span>
                    <span className="text-[10px] font-mono text-green-400 break-all">{deploymentResult.contractAddress}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-black text-gray-500">Transaction Hash</span>
                    <span className="text-[10px] font-mono text-blue-400 break-all">{deploymentResult.transactionHash}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="border-t border-[#2d2d2d]">
          <button onClick={() => toggleSection('details')} className="w-full px-4 py-3 bg-[#252526]/30 hover:bg-[#2d2d2d] text-[#cccccc] flex items-center justify-between transition-colors">
            <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-purple-400" /> Technical Details
            </span>
            {expandedSections.has('details') ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          
          {expandedSections.has('details') && (
            <div className="p-4 space-y-4 bg-[#1a1a1a]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase font-black text-gray-500">ABI</span>
                  <button onClick={() => copyToClipboard(JSON.stringify(result.abi, null, 2))} className="text-[9px] px-2 py-0.5 bg-[#333] hover:bg-[#444] text-[#ccc] rounded flex items-center gap-1"><Copy className="size-2.5" /> Copy</button>
                </div>
                <pre className="text-[10px] font-mono text-gray-400 bg-black/30 p-2 rounded max-h-32 overflow-y-auto custom-scrollbar">
                  {JSON.stringify(result.abi, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompileOutput;