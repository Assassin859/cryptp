import React, { useState, useEffect } from 'react';
import { Play, Search, Zap, Activity, AlertCircle, Info, User, RefreshCw, ChevronDown, ChevronUp, Fuel, List, Terminal, Sparkles } from 'lucide-react';

import { Interface, Result, Contract, parseEther, formatUnits, parseUnits } from 'ethers';
import { EventLog, GasReport } from '../utils/browserVM';
import { useWeb3 } from '../context/Web3Context';


interface ContractInteractionProps {
  abi: any[];
  address: string;
  network: string;
  onRefreshSimulations?: () => void;
  onTransactionExecuted?: (txHash: string) => void;
  onQueryAI?: (prompt: string) => void;
}

const ContractInteraction: React.FC<ContractInteractionProps> = ({ 
  abi, 
  address, 
  network, 
  onRefreshSimulations, 
  onTransactionExecuted,
  onQueryAI
}) => {
  const { signer, isConnected } = useWeb3();
  const [readFunctions, setReadFunctions] = useState<any[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<any[]>([]);
  const [expandedFunctions, setExpandedFunctions] = useState<{ [key: string]: boolean }>({});
  const [inputs, setInputs] = useState<{ [key: string]: { [argName: string]: string } }>({});
  const [inputUnits, setInputUnits] = useState<{ [key: string]: { [argName: string]: 'wei' | 'gwei' | 'ether' } }>({});
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);
  const [results, setResults] = useState<{ 
    [key: string]: { 
      output?: any; 
      rawValue?: any;
      error?: string; 
      loading?: boolean; 
      txHash?: string;
      gasReport?: GasReport;
      logs?: EventLog[];
      unit?: 'wei' | 'gwei' | 'ether';
    } 
  }>({});
  const [showGasDetail, setShowGasDetail] = useState<{ [key: string]: boolean }>({});


  useEffect(() => {
    if (!abi) return;

    const read = abi.filter(item => 
      item.type === 'function' && 
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
    );
    const write = abi.filter(item => 
      item.type === 'function' && 
      item.stateMutability !== 'view' && 
      item.stateMutability !== 'pure'
    );

    setReadFunctions(read);
    setWriteFunctions(write);

    // Initialize expanded state for first few functions
    const initialExpanded: { [key: string]: boolean } = {};
    read.slice(0, 3).forEach(f => { initialExpanded[f.name] = true; });
    write.slice(0, 3).forEach(f => { initialExpanded[f.name] = true; });
    setExpandedFunctions(initialExpanded);

    if (network === 'Local Simulation') {
        import('../utils/browserVM').then(({ browserVM }) => {
            setAccounts(browserVM.getAccounts());
        });
    }
  }, [abi, network]);

  const handleAccountChange = async (index: number) => {
      setActiveAccountIndex(index);
      if (network === 'Local Simulation') {
          const { browserVM } = await import('../utils/browserVM');
          browserVM.setActiveAccount(index);
      }
  };

  const toggleExpand = (name: string) => {
    setExpandedFunctions(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleInputChange = (funcName: string, argName: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [funcName]: { ...(prev[funcName] || {}), [argName]: value }
    }));
  };

  const handleInputUnitChange = (funcName: string, argName: string, unit: 'wei' | 'gwei' | 'ether') => {
    setInputUnits(prev => ({
      ...prev,
      [funcName]: { ...(prev[funcName] || {}), [argName]: unit }
    }));
  };

  const executeFunction = async (func: any, isRead: boolean) => {
    const funcName = func.name;
    setResults(prev => ({ ...prev, [funcName]: { loading: true } }));

    try {
      const iface = new Interface(abi);
      const argValues = func.inputs.map((input: any) => inputs[funcName]?.[input.name] || '');
      
      // Basic type conversion
      const processedArgs = func.inputs.map((input: any, index: number) => {
        const val = argValues[index];
        if (!val) {
           if (input.type.includes('uint') || input.type.includes('int')) return 0n;
           if (input.type === 'bool') return false;
           return '';
        }

        if (input.type.includes('uint') || input.type.includes('int')) {
          const unit = inputUnits[funcName]?.[input.name] || 'wei';
          try {
            if (unit === 'ether') return parseUnits(val, 18);
            if (unit === 'gwei') return parseUnits(val, 9);
            return BigInt(val);
          } catch (e) {
            return BigInt(0);
          }
        }
        if (input.type === 'bool') {
          return val.toLowerCase() === 'true';
        }

        // Complex types: arrays, structs, bytes
        if (input.type.includes('[]') || input.type.startsWith('bytes') || input.type.includes('tuple')) {
           try {
              return JSON.parse(val);
           } catch(e) {
              return val;
           }
        }

        return val;
      });

      const data = iface.encodeFunctionData(funcName, processedArgs);

      if (network === 'Local Simulation') {
        const { browserVM } = await import('../utils/browserVM');
        
        if (isRead) {
          const { returnValue, gasUsed } = await browserVM.runCall(address, data);
          
          if (returnValue === '0x' || !returnValue) {
            throw new Error("Empty return data (0x). This usually means the contract is not deployed at this address, or the function has no return value but the ABI expects one.");
          }

          const decoded = iface.decodeFunctionResult(funcName, returnValue);
          const rawValue = decoded.length === 1 ? decoded[0] : decoded;

          setResults(prev => ({ 
            ...prev, 
            [funcName]: { 
              output: formatOutput(decoded, prev[funcName]?.unit || 'wei'), 
              rawValue: rawValue,
              unit: prev[funcName]?.unit || 'wei',
              loading: false,
              gasReport: { total: gasUsed, execution: gasUsed, intrinsic: 0 } 
            } 
          }));
        } else {
          const ethValue = inputs[funcName]?._value || '0';
          const weiValue = parseEther(ethValue || '0');
          const { transactionHash, gasReport, logs } = await browserVM.sendTransaction(address, data, weiValue);
          setResults(prev => ({ 
            ...prev, 
            [funcName]: { txHash: transactionHash, gasReport, logs, loading: false } 
          }));
          if (onRefreshSimulations) onRefreshSimulations();
          if (onTransactionExecuted) onTransactionExecuted(transactionHash);
        }

      } else {
        // Real chain interaction logic (Metamask)
        if (!isConnected || !signer) {
          throw new Error('Please connect your wallet to interact with this contract on a real network.');
        }

        const contract = new Contract(address, abi, signer);
        
        if (isRead) {
          const result = await contract[funcName](...processedArgs);
          setResults(prev => ({ 
            ...prev, 
            [funcName]: { 
              output: formatOutput([result] as any, prev[funcName]?.unit || 'wei'), 
              rawValue: result,
              unit: prev[funcName]?.unit || 'wei',
              loading: false 
            } 
          }));
        } else {
          const ethValue = inputs[funcName]?._value || '0';
          const weiValue = parseEther(ethValue || '0');
          const tx = await contract[funcName](...processedArgs, { value: weiValue });
          setResults(prev => ({ 
            ...prev, 
            [funcName]: { txHash: tx.hash, loading: true } 
          }));
          
          const receipt = await tx.wait();
          setResults(prev => ({ 
            ...prev, 
            [funcName]: { 
              txHash: tx.hash, 
              loading: false,
              gasReport: { total: Number(receipt.gasUsed), execution: Number(receipt.gasUsed), intrinsic: 0 }
            } 
          }));
        }
      }
    } catch (err: any) {
      console.error('Execution Error:', err);
      setResults(prev => ({ 
        ...prev, 
        [funcName]: { error: err.message, loading: false } 
      }));
    }
  };

  const formatOutput = (result: Result, unit: string = 'wei'): string => {
    const val = result.length === 1 ? result[0] : result;
    
    // If it's a bigint/number and we have a unit selection
    if ((typeof val === 'bigint' || typeof val === 'number')) {
      if (unit === 'ether') return formatUnits(val, 18) + ' ETH';
      if (unit === 'gwei') return formatUnits(val, 9) + ' Gwei';
      return val.toString() + ' wei';
    }

    if (result.length === 1) return result[0].toString();
    
    return JSON.stringify(result.toObject(), (_key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 
    2);
  };

  const handleUnitChange = (funcName: string, unit: 'wei' | 'gwei' | 'ether') => {
    setResults(prev => {
      const res = prev[funcName];
      if (!res || res.rawValue === undefined) return prev;
      
      return {
        ...prev,
        [funcName]: {
          ...res,
          unit,
          output: formatOutput(Array.isArray(res.rawValue) ? res.rawValue as any : [res.rawValue] as any, unit)
        }
      };
    });
  };

  const renderFunction = (func: any, isRead: boolean) => {
    const isExpanded = expandedFunctions[func.name];
    const result = results[func.name];

    return (
      <div key={func.name} className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden mb-3 hover:border-gray-600 transition-colors shadow-sm">
        <button 
          onClick={() => toggleExpand(func.name)}
          className="w-full px-4 py-3 flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${isRead ? 'text-blue-400' : 'text-purple-400'}`} />
            <span className="font-mono text-sm text-gray-200 font-semibold">{func.name}</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-700/50 pt-3 space-y-3">
            {func.inputs.length > 0 && (
              <div className="space-y-2">
                {func.inputs.map((input: any) => (
                  <div key={input.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] text-gray-400 font-mono">
                        {input.name} ({input.type})
                      </label>
                      {(input.type.includes('uint') || input.type.includes('int')) && (
                        <div className="flex gap-1">
                          {['wei', 'gwei', 'ether'].map((u) => (
                            <button
                              key={u}
                              onClick={() => handleInputUnitChange(func.name, input.name, u as any)}
                              className={`text-[7px] px-1 rounded border uppercase font-bold transition-colors ${
                                (inputUnits[func.name]?.[input.name] || 'wei') === u 
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                  : 'bg-gray-950 border-gray-800 text-gray-600 hover:text-gray-400'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={input.type}
                      value={inputs[func.name]?.[input.name] || ''}
                      onChange={(e) => handleInputChange(func.name, input.name, e.target.value)}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            {func.stateMutability === 'payable' && (
              <div className="flex flex-col gap-1 mt-2 mb-2 p-2 bg-yellow-900/10 border border-yellow-700/30 rounded">
                 <label className="text-[10px] text-yellow-500 font-bold uppercase tracking-tight flex justify-between items-center">
                   <span>Transaction Value (ETH)</span>
                   <span className="text-[8px] bg-yellow-500/20 px-1 py-0.5 rounded text-yellow-300">payable</span>
                 </label>
                 <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={inputs[func.name]?._value || ''}
                    onChange={(e) => handleInputChange(func.name, '_value', e.target.value)}
                    className="bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-yellow-300 focus:outline-none focus:border-yellow-500 font-mono"
                 />
              </div>
            )}

            <button
              onClick={() => executeFunction(func, isRead)}
              disabled={result?.loading}
              className={`flex items-center justify-center gap-2 w-full py-1.5 rounded text-xs font-semibold transition ${
                result?.loading 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : isRead 
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/50 hover:bg-blue-600/30'
                    : 'bg-purple-600/20 text-purple-300 border border-purple-500/50 hover:bg-purple-600/30'
              }`}
            >
              {result?.loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : isRead ? <Search className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isRead ? 'Call / Read' : 'Transact / Write'}
            </button>

            {result && !result.loading && (
              <div className="space-y-3 mt-3">
                {/* Result/Error Display */}
                <div className={`p-2 rounded text-xs font-mono break-all border ${
                  result.error 
                    ? 'bg-red-900/10 border-red-900/50 text-red-400' 
                    : 'bg-green-900/10 border-green-900/50 text-green-400'
                }`}>
                  {result.error && (
                    <div className="flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{result.error}</span>
                    </div>
                  )}
                  {result.output && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Return Value:</span>
                        {(typeof result.rawValue === 'bigint' || typeof result.rawValue === 'number') && (
                          <div className="flex gap-1">
                            {['wei', 'gwei', 'ether'].map((u) => (
                              <button
                                key={u}
                                onClick={() => handleUnitChange(func.name, u as any)}
                                className={`text-[8px] px-1 rounded border uppercase font-bold transition-colors ${
                                  result.unit === u 
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                    : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-gray-400'
                                }`}
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold">{result.output}</span>
                    </div>
                  )}
                  {result.txHash && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 mb-1 font-bold uppercase tracking-tight">TX Hash:</span>
                      <span className="text-[10px] opacity-70">{result.txHash}</span>
                    </div>
                  )}
                </div>

                {/* Gas Analysis Component */}
                {result.gasReport && (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded overflow-hidden">
                    <button 
                      onClick={() => setShowGasDetail(prev => ({ ...prev, [func.name]: !prev[func.name] }))}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center justify-between flex-1 mr-4">
                        <div className="flex items-center gap-1.5">
                          <Fuel className="h-3 w-3 text-orange-400" />
                          Gas Analysis: {result.gasReport.total.toLocaleString()} units
                        </div>
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            onQueryAI?.(`Please help me optimize the gas usage for function "${func.name}" in contract "${address}". Recent gas used: ${result.gasReport?.total}. Execution: ${result.gasReport?.execution}. Intrinsic: ${result.gasReport?.intrinsic}. Highlight where the waste might be.`);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[8px] text-blue-400 hover:bg-blue-500/20 flex items-center gap-1 transition-all pointer-events-auto"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Optimize with AI
                        </div>
                      </div>
                      {showGasDetail[func.name] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showGasDetail[func.name] && (
                      <div className="px-3 py-2 border-t border-gray-700/30 space-y-2 animate-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-gray-950 p-1.5 rounded border border-gray-800">
                            <span className="text-gray-500 block mb-0.5">Execution Cost</span>
                            <span className="text-blue-400 font-mono">{result.gasReport.execution.toLocaleString()}</span>
                          </div>
                          <div className="bg-gray-950 p-1.5 rounded border border-gray-800">
                            <span className="text-gray-500 block mb-0.5">Intrinsic Cost</span>
                            <span className="text-purple-400 font-mono">{result.gasReport.intrinsic.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden flex border border-gray-800">
                          <div 
                            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${(result.gasReport.execution / result.gasReport.total) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ width: `${(result.gasReport.intrinsic / result.gasReport.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Event Logs Component */}
                {result.logs && result.logs.length > 0 && (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded overflow-hidden">
                    <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-700/30">
                      <List className="h-3 w-3 text-teal-400" />
                      Emitted Events ({result.logs.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto p-2 space-y-2">
                      {result.logs.map((log, idx) => {
                        const iface = new Interface(abi);
                        let parsed = null;
                        try {
                          parsed = iface.parseLog({ topics: log.topics, data: log.data });
                        } catch (e) {}

                        return (
                          <div key={idx} className="bg-gray-950 p-2 rounded border border-gray-800 font-mono text-[10px]">
                            {parsed ? (
                              <>
                                <div className="text-teal-400 font-bold mb-1 flex items-center gap-1">
                                  <Activity className="h-2.5 w-2.5" />
                                  {parsed.name}
                                </div>
                                <div className="space-y-1 pl-2 border-l border-gray-800 ml-1">
                                  {parsed.fragment.inputs.map((input, i) => (
                                    <div key={i} className="flex gap-2">
                                      <span className="text-gray-500">{input.name}:</span>
                                      <span className="text-gray-300 break-all">{parsed!.args[i].toString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-gray-500 mb-1 flex items-center gap-1 uppercase tracking-tighter">
                                  <Terminal className="h-2.5 w-2.5" />
                                  Unknown Event
                                </div>
                                <div className="space-y-1 opacity-70">
                                  <div className="flex gap-1">
                                    <span className="text-gray-600">Topic0:</span>
                                    <span className="text-gray-400 break-all">{log.topics[0]}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Contract Interaction</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          {network !== 'Local Simulation' && (
            <span className="bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-700/50 uppercase tracking-widest text-[9px] font-black mr-2">
              <Zap className="h-2.5 w-2.5 inline mr-1 mb-0.5" />
              Promoted
            </span>
          )}
          <span className={`${network === 'Local Simulation' ? 'bg-blue-900/30 border-blue-700/50' : 'bg-gray-900 border-gray-700'} px-2 py-0.5 rounded border`}>{network}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Info className="h-3 w-3" />
              Contract Address
            </h4>
            <div className="bg-gray-900 border border-gray-800 rounded p-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-mono text-blue-400 select-all">{address}</span>
            </div>
          </div>
          
          {network === 'Local Simulation' && accounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Active Sender (msg.sender)
                </h4>
                <select 
                   value={activeAccountIndex} 
                   onChange={(e) => handleAccountChange(Number(e.target.value))}
                   className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs font-mono text-purple-400 focus:border-blue-500 focus:outline-none"
                >
                   {accounts.map((acc, idx) => (
                       <option key={idx} value={idx}>Account {idx + 1}: {acc.slice(0, 8)}...{acc.slice(-6)} (100 ETH)</option>
                   ))}
                </select>
              </div>
          )}
        </div>

        <section>
          <h4 className="text-[11px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Search className="h-3 w-3" />
            Read Functions (Constant)
          </h4>
          {readFunctions.length > 0 ? (
            readFunctions.map(f => renderFunction(f, true))
          ) : (
            <p className="text-xs text-gray-500 italic px-2">No readable functions found (view/pure).</p>
          )}
        </section>

        <section>
          <h4 className="text-[11px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Activity className="h-3 w-3" />
            Write Functions (State-changing)
          </h4>
          {writeFunctions.length > 0 ? (
            writeFunctions.map(f => renderFunction(f, false))
          ) : (
            <p className="text-xs text-gray-500 italic px-2">No state-changing functions found.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ContractInteraction;
