import React, { useState } from 'react';
import { DEFAULT_GAS_LIMIT, MIN_GAS_LIMIT, MAX_GAS_LIMIT } from '../constants/gas';
import { CompilationResult } from '../utils/hardhatCompiler';
import { ethers, ContractFactory, InterfaceAbi } from 'ethers';
import { SimulatedDeployment } from '../types';
import { browserVM } from '../utils/browserVM';
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
import { getErrorMessage } from '../utils/errorMessage';
import { isAbiFunction, asAbiArray } from '../types/abi';
import { parseConstructorArgs, encodeConstructorSuffix } from '../utils/constructorArgs';
import type { SaveDeploymentPayload } from '../utils/userData';

interface CompileOutputProps {
  result: CompilationResult;
  code?: string;
  canDeploy?: boolean;
  onDeployment?: (entry: SimulatedDeployment, extra?: Partial<SaveDeploymentPayload>) => void;
  deploymentResult?: SimulatedDeployment | null;
}

const CompileOutput: React.FC<CompileOutputProps> = ({ result, onDeployment, deploymentResult, canDeploy = true }) => {
  const { account, networkName, isConnected, connect } = useWeb3();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'constructor']));
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [executionEnv, setExecutionEnv] = useState<'sandbox' | 'injected'>('sandbox');
  const [gasLimit, setGasLimit] = useState<string>(String(DEFAULT_GAS_LIMIT));
  const [constructorArgs, setConstructorArgs] = useState<Record<string, string>>({});

  const abiList = asAbiArray(result.abi);
  const constructorInputs = (abiList.find(
    (item: any) => item && item.type === 'constructor'
  ) as any)?.inputs || [];

  const isDegradedCompile = Boolean(result.isMockResult || result.isHardcoded);
  const deployBlocked = !canDeploy || isDegradedCompile;
  const deployBlockedReason = !canDeploy
    ? 'Source changed since last compile. Recompile before deploying.'
    : result.isHardcoded
    ? 'Bytecode was injected manually and cannot be deployed from this panel.'
    : result.isMockResult
      ? 'Compilation did not produce real bytecode. Fix errors and recompile.'
      : null;

  const clampGasLimit = (raw: string): number => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < MIN_GAS_LIMIT) return DEFAULT_GAS_LIMIT;
    return Math.min(parsed, MAX_GAS_LIMIT);
  };

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

  const isMetaMaskAvailable = () => typeof window !== 'undefined' && Boolean(window.ethereum);

  const deployWithMetaMask = async () => {
    if (deployBlocked) return;
    if (!result.abi || !result.bytecode) {
      setDeploymentError('ABI or bytecode missing');
      return;
    }

    if (!isMetaMaskAvailable() || !window.ethereum) {
      setDeploymentError('MetaMask not detected.');
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abi = result.abi as InterfaceAbi;
      const factory = new ContractFactory(abi, result.bytecode, signer);
      
      const processedArgs = parseConstructorArgs(constructorInputs, constructorArgs);
      const deployment = await factory.deploy(...processedArgs);
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

      onDeployment?.(deploymentEntry, { deployment_kind: 'promoted', constructor_args: processedArgs });
    } catch (error: unknown) {
      setDeploymentError(getErrorMessage(error) || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const deployLocalSimulation = async () => {
    if (deployBlocked || !result.abi || !result.bytecode) return;

    setIsDeploying(true);
    setDeploymentError(null);

    try {
      // browserVM is statically imported at the top
      const safeGasLimit = clampGasLimit(gasLimit);
      const processedArgs = parseConstructorArgs(constructorInputs, constructorArgs);

      let finalBytecode = result.bytecode;
      if (processedArgs.length > 0) {
        finalBytecode = result.bytecode + encodeConstructorSuffix(processedArgs, result.abi);
      }

      const deployResult = await browserVM.deployContract(finalBytecode, safeGasLimit);
      const blockNumber = await browserVM.getBlockNumber();

      const simulated: SimulatedDeployment = {
        contractAddress: deployResult.contractAddress,
        transactionHash: deployResult.transactionHash,
        network: 'Local Simulation',
        blockNumber: blockNumber,
        gasUsed: deployResult.gasUsed,
        deployer: browserVM.getActiveAccount(),
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        isRealChain: false
      };

      onDeployment?.(simulated, {
        deployment_kind: 'deploy',
        bytecode: result.bytecode,
        constructor_args: processedArgs,
        gas_limit: safeGasLimit,
      });
    } catch (error: unknown) {
      setDeploymentError(getErrorMessage(error) || 'Local simulation failed');
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
          {result.errors?.map((error, idx) => {
            const line = error.sourceLocation?.start;
            const fileName = error.sourceLocation?.file || 'contract.sol';
            return (
              <div key={idx} className="p-3 rounded bg-red-900/10 border border-red-700/30 text-[11px] font-mono text-red-300 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase text-red-500/60">
                  <span>{fileName}</span>
                  {line !== undefined && <span className="px-1 bg-red-500/20 rounded">Line {line}</span>}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">{error.message}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const functionCount = abiList.filter(isAbiFunction).length;
  const stateFunctionCount = abiList.filter(
    (i) => isAbiFunction(i) && i.stateMutability !== 'view' && i.stateMutability !== 'pure'
  ).length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="bg-[#252526] border-b border-[#2d2d2d] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-green-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Contract Ready</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {deployBlocked && !isDegradedCompile && (
          <div className="mx-4 mt-4 p-3 rounded border border-amber-500/40 bg-amber-950/30 text-amber-200">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Stale compile
            </div>
            <p className="text-[10px] mt-1 text-amber-200/90">{deployBlockedReason}</p>
          </div>
        )}
        {isDegradedCompile && (
          <div className="mx-4 mt-4 p-3 rounded border border-amber-500/40 bg-amber-950/30 text-amber-200">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Degraded compile
            </div>
            <p className="text-[10px] mt-1 text-amber-200/90">
              {deployBlockedReason} Deployment is disabled until you have a valid WASM compile result.
            </p>
          </div>
        )}
        <div className="border-b border-[#2d2d2d]">
          <button type="button" onClick={() => toggleSection('overview')} className="w-full px-4 py-3 bg-[#252526]/30 hover:bg-[#2d2d2d] text-[#cccccc] flex items-center justify-between transition-colors">
            <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-blue-400" /> Contract Info
            </span>
            {expandedSections.has('overview') ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          
          {expandedSections.has('overview') && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#1a1a1a]">
              <div className="bg-[#252526] p-3 rounded border border-[#333]">
                <div className="text-[9px] uppercase font-black text-gray-500 mb-1">Contract Size</div>
                <div className="text-xs font-mono text-green-400">{result.contractSize || '0'} bytes</div>
              </div>
              <div className="bg-[#252526] p-3 rounded border border-[#333]">
                <div className="text-[9px] uppercase font-black text-gray-500 mb-1">Total Functions</div>
                <div className="text-xs font-mono text-blue-400">{functionCount}</div>
              </div>
              <div className="bg-[#252526] p-3 rounded border border-[#333] col-span-2 md:col-span-1">
                <div className="text-[9px] uppercase font-black text-gray-500 mb-1">State Functions</div>
                <div className="text-xs font-mono text-blue-400">{stateFunctionCount}</div>
              </div>
            </div>
          )}
        </div>

        {constructorInputs.length > 0 && (
          <div className="border-b border-[#2d2d2d]">
            <button type="button" onClick={() => toggleSection('constructor')} className="w-full px-4 py-3 bg-[#252526]/30 hover:bg-[#2d2d2d] text-[#cccccc] flex items-center justify-between transition-colors">
              <span className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Rocket className="h-3.5 w-3.5 text-purple-400" /> Constructor Arguments
              </span>
              {expandedSections.has('constructor') ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            
            {expandedSections.has('constructor') && (
              <div className="p-4 space-y-3 bg-[#1a1a1a] border-t border-[#2d2d2d]/30">
                {constructorInputs.map((input: any, index: number) => {
                  const inputName = input.name || `arg_${index}`;
                  return (
                    <div key={inputName} className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono">
                        {input.name ? `${input.name} (${input.type})` : input.type}
                      </label>
                      <input
                        type="text"
                        value={constructorArgs[input.name || ''] || ''}
                        onChange={(e) => setConstructorArgs(prev => ({ ...prev, [input.name || '']: e.target.value }))}
                        placeholder={input.type.includes('[]') ? '["val1", "val2"]' : `e.g. ${input.type}`}
                        className="bg-[#252526] border border-[#333] hover:border-[#007acc] text-[11px] font-mono text-[#cccccc] px-3 py-2 rounded outline-none focus:border-[#007acc] transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-black text-gray-500 mb-1.5 block tracking-widest">Execution Environment</label>
              <div className="relative group">
                <select 
                  value={executionEnv}
                  onChange={(e) => setExecutionEnv(e.target.value as 'sandbox' | 'injected')}
                  className="w-full bg-[#252526] border border-[#333] hover:border-[#007acc] text-[11px] font-bold text-[#cccccc] px-3 py-2.5 rounded appearance-none transition-all cursor-pointer outline-none shadow-inner"
                >
                  <option value="sandbox">CryptP Sandbox (Browser VM)</option>
                  <option value="injected">Injected Provider (MetaMask)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {executionEnv === 'sandbox' && (
              <div>
                <label className="text-[10px] uppercase font-black text-gray-500 mb-1.5 block tracking-widest">
                  Gas Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={MIN_GAS_LIMIT}
                    max={MAX_GAS_LIMIT}
                    step={100000}
                    value={gasLimit}
                    onChange={(e) => setGasLimit(e.target.value)}
                    className="flex-1 bg-[#252526] border border-[#333] hover:border-[#007acc] text-[11px] font-mono text-[#cccccc] px-3 py-2 rounded outline-none focus:border-[#007acc] transition-all"
                    placeholder={String(DEFAULT_GAS_LIMIT)}
                  />
                  <button
                    type="button"
                    onClick={() => setGasLimit(String(DEFAULT_GAS_LIMIT))}
                    className="text-[9px] px-2 py-2 bg-[#333] hover:bg-[#444] text-gray-400 rounded whitespace-nowrap transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <p className="text-[9px] text-gray-600 mt-1">
                  Uniswap V3 Factory needs ~4.5M · ERC-20 needs ~1.5M
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              {executionEnv === 'injected' && !isConnected ? (
                <button
                  type="button"
                  onClick={connect}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <Wallet className="size-4" /> Connect Wallet to Deploy
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executionEnv === 'sandbox' ? deployLocalSimulation : deployWithMetaMask}
                  disabled={isDeploying || deployBlocked}
                  title={deployBlocked ? deployBlockedReason ?? undefined : undefined}
                  className={`w-full px-4 py-3 rounded font-bold text-xs flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 group ${
                    executionEnv === 'sandbox' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#007acc] hover:bg-[#0062a3]'
                  } ${isDeploying || deployBlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
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

            {deploymentError && (
              <div className="p-3 bg-red-900/20 border border-red-700/30 rounded">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle className="size-3.5" />
                  <span className="text-[10px] font-bold uppercase">Deployment Failed</span>
                </div>
                <div className="text-[11px] text-red-300 font-mono mb-2 break-words">{deploymentError}</div>
                <button type="button" onClick={() => setDeploymentError(null)} className="text-[10px] px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded">Dismiss</button>
              </div>
            )}

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

        <div className="border-t border-[#2d2d2d]">
          <button type="button" onClick={() => toggleSection('details')} className="w-full px-4 py-3 bg-[#252526]/30 hover:bg-[#2d2d2d] text-[#cccccc] flex items-center justify-between transition-colors">
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
                  <button type="button" onClick={() => copyToClipboard(JSON.stringify(result.abi, null, 2))} className="text-[9px] px-2 py-0.5 bg-[#333] hover:bg-[#444] text-[#ccc] rounded flex items-center gap-1"><Copy className="size-2.5" /> Copy</button>
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
