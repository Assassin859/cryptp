import React, { useState, useEffect } from 'react';
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
  Wallet,
  Layers,
} from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';
import { getErrorMessage } from '../utils/errorMessage';
import { isAbiFunction, asAbiArray, isReadFunction } from '../types/abi';
import { parseConstructorArgs, encodeConstructorSuffix, constructorArgKey } from '../utils/constructorArgs';
import type { SaveDeploymentPayload } from '../utils/userData';
import { creAllowsLiveDeploy } from '../utils/creClient';
import { isCreGateEnabled } from '../utils/creConstants';
import { SEPOLIA_CHAIN_ID } from '../utils/ethUsdConstants';
import { abiLooksLikeCounterHook } from '../utils/hookMiner';
import { deployCounterHookCreate2 } from '../utils/counterHookCreate2';
import {
  getCounterHookAddress,
  getSepoliaPoolManager,
} from '../utils/uniswapConstants';
import { priceService } from '../utils/PriceService';

interface CompileOutputProps {
  result: CompilationResult;
  code?: string;
  contentHash?: string;
  canDeploy?: boolean;
  onDeployment?: (entry: SimulatedDeployment, extra?: Partial<SaveDeploymentPayload>) => void;
  deploymentResult?: SimulatedDeployment | null;
  onOpenConfidentialAudit?: () => void;
  /** IDE ConfirmModal for CRE MANUAL_REVIEW (replaces window.confirm). */
  onConfirmManualReview?: (message: string) => Promise<boolean>;
}

const CompileOutput: React.FC<CompileOutputProps> = ({
  result,
  contentHash,
  onDeployment,
  deploymentResult,
  canDeploy = true,
  onOpenConfidentialAudit,
  onConfirmManualReview,
}) => {
  const { account, networkName, isConnected, connect } = useWeb3();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'constructor']));
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [executionEnv, setExecutionEnv] = useState<'sandbox' | 'injected'>('sandbox');
  const [gasLimit, setGasLimit] = useState<string>(String(DEFAULT_GAS_LIMIT));
  const [constructorArgs, setConstructorArgs] = useState<Record<string, string>>({});
  const [useCreate2Hook, setUseCreate2Hook] = useState(false);
  const [create2Info, setCreate2Info] = useState<string | null>(null);
  const [bumpInfo, setBumpInfo] = useState<string | null>(null);
  const [deployCostHint, setDeployCostHint] = useState<string | null>(null);

  const abiList = asAbiArray(result.abi);
  const constructorInputs = (abiList.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => item && item.type === 'constructor'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any)?.inputs || [];

  const isCounterHook = abiLooksLikeCounterHook(result.abi);

  const isDegradedCompile = Boolean(result.isMockResult);
  const deployBlocked = !canDeploy || isDegradedCompile;
  const deployBlockedReason = !canDeploy
    ? 'Source changed since last compile. Recompile before deploying.'
    : result.isMockResult
      ? 'Compilation did not produce real bytecode. Fix errors and recompile.'
      : null;

  const clampGasLimit = (raw: string): number => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < MIN_GAS_LIMIT) return DEFAULT_GAS_LIMIT;
    return Math.min(parsed, MAX_GAS_LIMIT);
  };

  useEffect(() => {
    if (!isCounterHook) return;
    setUseCreate2Hook(true);
    const poolManager = getSepoliaPoolManager();
    setConstructorArgs((prev) => {
      const next = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructorInputs.forEach((input: any, index: number) => {
        if (input.type === 'address') {
          const key = constructorArgKey(input, index);
          if (!next[key]?.trim()) {
            next[key] = poolManager;
          }
        }
      });
      return next;
    });
  }, [isCounterHook, result.abi]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await priceService.getLatestData();
        if (cancelled) return;
        const safeGas = clampGasLimit(gasLimit);
        const ethAmount = safeGas * data.gas_price_gwei * 1e-9;
        const usd = priceService.calculateUSD(ethAmount, data.eth_usd);
        setDeployCostHint(
          `~$${usd.toFixed(2)} USD · ${data.gas_price_gwei.toFixed(1)} gwei · $${data.eth_usd.toFixed(2)} ETH/USD (${data.source})`
        );
      } catch {
        if (!cancelled) setDeployCostHint(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gasLimit]);

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

  const assertCreGate = async (): Promise<boolean> => {
    if (!isCreGateEnabled()) return true;
    const hash = contentHash || '';
    const gate = creAllowsLiveDeploy(hash);
    if (!gate.ok && !gate.needsConfirm) {
      setDeploymentError(gate.message);
      onOpenConfidentialAudit?.();
      return false;
    }
    if (gate.needsConfirm) {
      const proceed = onConfirmManualReview
        ? await onConfirmManualReview(gate.message)
        : false;
      if (!proceed) {
        onOpenConfidentialAudit?.();
        return false;
      }
    }
    return true;
  };

  const deployCreate2CounterHook = async () => {
    if (deployBlocked) return;
    if (!result.abi || !result.bytecode) {
      setDeploymentError('ABI or bytecode missing');
      return;
    }

    if (!isMetaMaskAvailable() || !window.ethereum) {
      setDeploymentError('MetaMask not detected.');
      return;
    }

    if (!(await assertCreGate())) return;

    setIsDeploying(true);
    setDeploymentError(null);
    setCreate2Info(null);
    setBumpInfo(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abi = result.abi as InterfaceAbi;
      const processedArgs = parseConstructorArgs(constructorInputs, constructorArgs);

      const deployed = await deployCounterHookCreate2({
        signer,
        provider,
        abi,
        bytecode: result.bytecode,
        constructorArgs: processedArgs,
        onProgress: (msg) => {
          if (msg.includes('sandboxBumpAfterSwap') || msg.includes('afterSwapCount')) {
            setBumpInfo(msg);
          } else {
            setCreate2Info(msg);
          }
        },
      });

      const deploymentEntry: SimulatedDeployment = {
        contractAddress: deployed.address,
        transactionHash: deployed.deployTxHash || deployed.bumpTxHash,
        network: networkName || 'Sepolia',
        blockNumber: deployed.blockNumber,
        gasUsed: deployed.gasUsed,
        deployer: account || deployed.deployer,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        isRealChain: true,
        abi: result.abi as SimulatedDeployment['abi'],
      };

      onDeployment?.(deploymentEntry, {
        deployment_kind: 'promoted',
        constructor_args: processedArgs,
      });
    } catch (error: unknown) {
      setDeploymentError(getErrorMessage(error) || 'CREATE2 CounterHook deploy failed');
    } finally {
      setIsDeploying(false);
    }
  };

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

    if (useCreate2Hook && isCounterHook) {
      return deployCreate2CounterHook();
    }

    if (!(await assertCreGate())) return;

    setIsDeploying(true);
    setDeploymentError(null);
    setCreate2Info(null);
    setBumpInfo(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== SEPOLIA_CHAIN_ID) {
        setDeploymentError(
          `Wrong network: MetaMask is on chain ${Number(net.chainId)}. Switch to Sepolia (${SEPOLIA_CHAIN_ID}) before deploying.`
        );
        return;
      }
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
        isRealChain: true,
        abi: result.abi as SimulatedDeployment['abi'],
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
    setCreate2Info(null);
    setBumpInfo(null);

    try {
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
        isRealChain: false,
        abi: result.abi as SimulatedDeployment['abi'],
        bytecode: result.bytecode,
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
    (i) => isAbiFunction(i) && !isReadFunction(i)
  ).length;

  const isCreate2Deploy =
    executionEnv === 'injected' && isCounterHook && useCreate2Hook;

  const deployButtonLabel =
    executionEnv === 'sandbox'
      ? 'Deploy to Sandbox'
      : isCreate2Deploy
        ? 'Deploy CounterHook (CREATE2)'
        : `Deploy to ${networkName || 'Network'}`;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="bg-[#252526] border-b border-[#2d2d2d] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-green-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Contract Ready</span>
          {isCounterHook && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-pink-400/80 flex items-center gap-1 ml-1">
              <Layers className="h-3 w-3" /> CounterHook
            </span>
          )}
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {constructorInputs.map((input: any, index: number) => {
                  const inputName = constructorArgKey(input, index);
                  return (
                    <div key={inputName} className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono">
                        {input.name ? `${input.name} (${input.type})` : `${input.type} (#${index})`}
                      </label>
                      <input
                        type="text"
                        value={constructorArgs[inputName] || ''}
                        onChange={(e) => setConstructorArgs(prev => ({ ...prev, [inputName]: e.target.value }))}
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
                  <option value="sandbox">Aethon Sandbox (Browser VM)</option>
                  <option value="injected">Injected Provider (MetaMask)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {executionEnv === 'injected' && isCounterHook && (
              <label className="flex items-start gap-2.5 p-3 rounded border border-pink-500/30 bg-pink-500/5 cursor-pointer hover:bg-pink-500/10 transition-colors">
                <input
                  type="checkbox"
                  checked={useCreate2Hook}
                  onChange={(e) => setUseCreate2Hook(e.target.checked)}
                  className="mt-0.5 accent-pink-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-300">
                    <Layers className="h-3.5 w-3.5" />
                    Uniswap v4 CREATE2
                  </div>
                  <p className="text-[9px] text-pink-200/70 mt-1 leading-relaxed">
                    Mine a salt so the hook address encodes BEFORE_SWAP | AFTER_SWAP (0xc0) and deploy via the CREATE2 proxy on Sepolia.
                    Known hook: <span className="font-mono text-pink-200/90">{getCounterHookAddress()}</span>
                  </p>
                </div>
              </label>
            )}

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
                    executionEnv === 'sandbox'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : isCreate2Deploy
                        ? 'bg-pink-600 hover:bg-pink-700'
                        : 'bg-[#007acc] hover:bg-[#0062a3]'
                  } ${isDeploying || deployBlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {isDeploying ? (
                      <Loader className="size-4 animate-spin text-white" />
                    ) : isCreate2Deploy ? (
                      <Layers className="size-4 text-white group-hover:scale-110 transition-transform" />
                    ) : (
                      <Rocket className="size-4 text-white group-hover:scale-110 transition-transform" />
                    )}
                    <span>{deployButtonLabel}</span>
                  </div>
                  <span className="text-[9px] opacity-60 font-medium mt-0.5">
                    {executionEnv === 'sandbox'
                      ? 'Instant • No Gas Required'
                      : isCreate2Deploy
                        ? `Sepolia CREATE2 · ${account?.slice(0, 10)}…`
                        : `Account: ${account?.slice(0, 10)}...`}
                  </span>
                </button>
              )}

              {deployCostHint && (
                <p className="text-[9px] text-gray-500 font-mono text-center leading-relaxed">
                  Est. gas {clampGasLimit(gasLimit).toLocaleString()} · {deployCostHint}
                </p>
              )}

              {create2Info && (
                <div className="p-2.5 rounded border border-pink-500/30 bg-pink-950/20 text-[10px] font-mono text-pink-200/90 leading-relaxed">
                  {create2Info}
                </div>
              )}

              {bumpInfo && (
                <div className="p-2.5 rounded border border-green-700/30 bg-green-950/20 text-[10px] font-mono text-green-300/90 leading-relaxed">
                  {bumpInfo}
                </div>
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
