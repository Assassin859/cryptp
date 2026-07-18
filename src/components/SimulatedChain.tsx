import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Link, 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Activity, 
  Wallet, 
  Info,
  X,
  Play,
  Zap
} from 'lucide-react';
import { browserVM } from '../utils/browserVM';
import { SimulatedDeployment } from '../types';

interface SimulatedChainProps {
  deployments: SimulatedDeployment[];
  onReset?: () => void;
  onInteract?: (deployment: SimulatedDeployment) => void;
  onPromote?: (deployment: SimulatedDeployment) => void;
}

interface PulseAnimation {
  id: string;
  lineId: string;
  progress: number; // 0 to 1
  color: string;
}

const SimulatedChain: React.FC<SimulatedChainProps> = ({ 
  deployments, 
  onReset, 
  onInteract, 
  onPromote 
}) => {
  const [nodeStatus, setNodeStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [initError, setInitError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  
  // Canvas State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Inspector & Simulation State
  const [selectedNode, setSelectedNode] = useState<{
    type: 'wallet' | 'contract';
    id: string;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'info' | 'interact' | 'state'>('info');
  const [simCalldata, setSimCalldata] = useState('');
  const [simValue, setSimValue] = useState('0');
  const [simGasLimit, setSimGasLimit] = useState('3000000');
  const [simSelectedWallet, setSimSelectedWallet] = useState('');
  const [txLogs, setTxLogs] = useState<string[]>([]);
  const [isExecutingTx, setIsExecutingTx] = useState(false);

  // Visual pulse particles
  const [pulses, setPulses] = useState<PulseAnimation[]>([]);
  const pulseIdRef = useRef(0);

  const checkNode = useCallback(async () => {
    try {
      await browserVM.init();
      const status = browserVM.getInitStatus();
      if (status.failed) {
        setInitError(status.error);
        setNodeStatus('offline');
      } else {
        setInitError(null);
        setNodeStatus(status.ready ? 'online' : 'offline');
        
        // Fetch accounts and balances
        const accs = browserVM.getAccounts();
        setAccounts(accs);
        if (accs.length > 0 && !simSelectedWallet) {
          setSimSelectedWallet(accs[0]);
        }
        
        const bals: Record<string, string> = {};
        for (const acc of accs) {
          const bal = await browserVM.getAccountBalance(acc);
          bals[acc] = bal;
        }
        setBalances(bals);
      }
    } catch {
      setInitError('Failed to reach the in-browser EVM');
      setNodeStatus('offline');
    }
  }, [simSelectedWallet]);

  useEffect(() => {
    checkNode();
    const interval = setInterval(checkNode, 8000);
    return () => clearInterval(interval);
  }, [checkNode]);

  // Canvas Drag & Pan Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node') || (e.target as HTMLElement).closest('.inspector-panel')) {
      return;
    }
    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(2, Math.max(0.5, prev * factor)));
  };

  const triggerPulse = (fromX: number, fromY: number, toX: number, toY: number, color: string = '#10B981') => {
    const pulseId = `pulse-${pulseIdRef.current++}`;
    const startPulse: PulseAnimation = {
      id: pulseId,
      lineId: 'dynamic',
      progress: 0,
      color
    };
    
    setPulses(prev => [...prev, startPulse]);
    
    const startTime = performance.now();
    const duration = 1200; // ms
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      setPulses(prev => 
        prev.map(p => p.id === pulseId ? { ...p, progress } : p)
      );
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setPulses(prev => prev.filter(p => p.id !== pulseId));
        }, 100);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const executeSimulatedTx = async (contractAddress: string) => {
    if (!simSelectedWallet) return;
    setIsExecutingTx(true);
    setTxLogs(prev => [...prev, `[EVM] Initiating call to ${contractAddress.slice(0, 10)}...`]);
    
    const activeIdx = accounts.indexOf(simSelectedWallet);
    const contractIdx = deployments.findIndex(dep => dep.contractAddress.toLowerCase() === contractAddress.toLowerCase());

    if (activeIdx !== -1 && contractIdx !== -1) {
      const fromX = 120 + 130;
      const fromY = 100 + activeIdx * 110 + 40;
      const toX = 480;
      const toY = 120 + contractIdx * 140 + 45;
      triggerPulse(fromX, fromY, toX, toY, '#10b981');
    }

    try {
      // Find active index
      const activeIdx = accounts.indexOf(simSelectedWallet);
      if (activeIdx !== -1) {
        browserVM.setActiveAccount(activeIdx);
      }

      // Detect write vs read from calldata
      // If we have select fields or custom input, execute it
      const valueWei = BigInt(simValue);
      const gasLim = Number(simGasLimit);
      
      const res = await browserVM.sendTransaction(contractAddress, simCalldata || '0x', valueWei, gasLim);
      
      setTxLogs(prev => [
        ...prev,
        `[EVM] Tx Successful! Hash: ${res.transactionHash.slice(0, 12)}...`,
        `[EVM] Gas Used: ${res.gasUsed.toLocaleString()} units`,
        `[EVM] Events emitted: ${res.logs.length}`
      ]);
      
      // Update balance
      await checkNode();
    } catch (err: unknown) {
      setTxLogs(prev => [...prev, `[EVM Revert] Call failed: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsExecutingTx(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden relative">
      {/* Top Header */}
      <div className="bg-[#252526] border-b border-[#2d2d2d] px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">EVM Sandbox Node Canvas</h3>
          
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            nodeStatus === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
            nodeStatus === 'checking' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {nodeStatus === 'checking' ? 'Syncing...' : nodeStatus === 'online' ? 'EVM Node Online' : 'EVM Offline'}
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#1e1e1e] border border-[#333] rounded px-1.5 py-0.5 gap-2 text-[10px]">
            <button onClick={() => handleZoom(0.9)} className="text-gray-400 hover:text-white px-1 font-bold">-</button>
            <span className="text-gray-300 font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(1.1)} className="text-gray-400 hover:text-white px-1 font-bold">+</button>
          </div>

          {onReset && (
            <button onClick={onReset} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold transition-colors">
              <Trash2 className="h-3 w-3" /> Reset EVM
            </button>
          )}
        </div>
      </div>

      {initError && (
        <div className="mx-4 mt-3 p-3 rounded border border-red-500/30 bg-red-950/40 flex items-start justify-between gap-3 z-10 shrink-0">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-red-300 uppercase">EVM initialization failed</p>
              <p className="text-[10px] text-red-200/80 mt-0.5">{initError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => checkNode()}
            className="text-[9px] px-2 py-1 rounded bg-red-800/60 hover:bg-red-700 text-white flex items-center gap-1 shrink-0 font-semibold"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#141414]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Connection SVGs */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0', overflow: 'visible' }}>
          <defs>
            <linearGradient id="gradient-connector" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Render connection lines */}
          {accounts.map((acc, wIdx) => {
            const fPos = { x: 120, y: 100 + wIdx * 110 };

            return deployments.map((dep, cIdx) => {
              const tPos = { x: 480, y: 120 + cIdx * 140 };

              // Cubic bezier curves for premium visual look
              const fromX = fPos.x + 130;
              const fromY = fPos.y + 40;
              const toX = tPos.x;
              const toY = tPos.y + 45;
              const controlX1 = fromX + 80;
              const controlY1 = fromY;
              const controlX2 = toX - 80;
              const controlY2 = toY;

              const pathD = `M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`;

              return (
                <g key={`${acc}-${dep.contractAddress}-${dep.transactionHash}`}>
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke="url(#gradient-connector)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                  />
                </g>
              );
            });
          })}

          {/* Render animated pulses */}
          {pulses.map(pulse => {
            const wIdx = accounts.indexOf(simSelectedWallet);
            const cIdx = deployments.findIndex(dep => dep.contractAddress.toLowerCase() === selectedNode?.id.toLowerCase());
            if (wIdx === -1 || cIdx === -1) return null;

            const fromX = 120 + 130;
            const fromY = 100 + wIdx * 110 + 40;
            const toX = 480;
            const toY = 120 + cIdx * 140 + 45;
            const controlX1 = fromX + 80;
            const controlY1 = fromY;
            const controlX2 = toX - 80;
            const controlY2 = toY;

            // Compute current point along Bezier curve
            const t = pulse.progress;
            const x = Math.pow(1-t, 3)*fromX + 3*Math.pow(1-t, 2)*t*controlX1 + 3*(1-t)*Math.pow(t, 2)*controlX2 + Math.pow(t, 3)*toX;
            const y = Math.pow(1-t, 3)*fromY + 3*Math.pow(1-t, 2)*t*controlY1 + 3*(1-t)*Math.pow(t, 2)*controlY2 + Math.pow(t, 3)*toY;

            return (
              <g key={pulse.id}>
                <circle cx={x} cy={y} r="10" fill="url(#glow-grad)" />
                <circle cx={x} cy={y} r="4" fill={pulse.color} className="animate-pulse" />
              </g>
            );
          })}
        </svg>

        {/* Nodes Grid */}
        <div 
          className="absolute inset-0 origin-top-left" 
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* Wallets Column */}
          <div className="absolute left-0 top-0 p-4 space-y-6">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2 pl-4">Simulation Accounts</h4>
            {accounts.map((acc, index) => {
              const pos = { x: 120, y: 100 + index * 110 };
              const isSelected = selectedNode?.type === 'wallet' && selectedNode.id === acc;

              return (
                <div
                  key={acc}
                  className={`canvas-node absolute bg-[#1e1e1e] border rounded-lg p-3 w-52 flex flex-col gap-1 transition-all shadow-md ${
                    isSelected ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] bg-gray-900' : 'border-[#333] hover:border-gray-600'
                  }`}
                  style={{ left: pos.x, top: pos.y }}
                  onClick={() => setSelectedNode({
                    type: 'wallet',
                    id: acc,
                    label: `Simulation Wallet #${index}`,
                    data: { balance: balances[acc] || '0', index }
                  })}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">Wallet #{index}</span>
                    <Wallet className="size-3 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-mono text-blue-300 truncate">{acc}</span>
                  <div className="flex items-center justify-between border-t border-gray-800/80 pt-1.5 mt-1">
                    <span className="text-[9px] text-gray-500 font-semibold uppercase">Balance</span>
                    <span className="text-[10px] font-bold text-yellow-500">{parseFloat(balances[acc] || '0').toFixed(4)} ETH</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contracts Column */}
          <div className="absolute top-0 p-4 space-y-6" style={{ left: '460px' }}>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2 pl-4">Deployed Sandbox Contracts</h4>
            {deployments.length === 0 ? (
              <div className="absolute top-24 left-8 text-center p-6 border border-dashed border-[#333] bg-[#1a1a1a]/40 rounded-lg w-72">
                <span className="text-xl mb-1 block">📦</span>
                <p className="text-[10px] font-bold text-gray-400 uppercase">No Deployed Contracts</p>
                <p className="text-[10px] text-gray-500 mt-1">Compile and deploy a Solidity file to see it on the canvas.</p>
              </div>
            ) : (
              deployments.map((dep, index) => {
                const pos = { x: 480, y: 120 + index * 140 };
                const isSelected = selectedNode?.type === 'contract' && selectedNode.id.toLowerCase() === dep.contractAddress.toLowerCase();

                return (
                  <div
                    key={`${dep.contractAddress}-${dep.transactionHash}`}
                    className={`canvas-node absolute bg-[#1e1e1e] border rounded-lg p-3.5 w-60 flex flex-col gap-1 transition-all shadow-md ${
                      isSelected ? 'border-green-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] bg-gray-900' : 'border-[#333] hover:border-gray-600'
                    }`}
                    style={{ left: pos.x - 480, top: pos.y }}
                    onClick={() => setSelectedNode({
                      type: 'contract',
                      id: dep.contractAddress,
                      label: dep.contractAddress.slice(0, 10) + '...',
                      data: dep
                    })}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-300 truncate max-w-[140px]">Block #{dep.blockNumber}</span>
                      <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-black uppercase">Contract</span>
                    </div>
                    <span className="text-[10px] font-mono text-green-300 truncate">{dep.contractAddress}</span>
                    <div className="flex items-center justify-between border-t border-gray-800/80 pt-2 mt-1">
                      <span className="text-[9px] text-gray-500 font-semibold uppercase">Network</span>
                      <span className="text-[9px] text-gray-300 font-bold">{dep.network}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500 font-semibold uppercase">Gas Used</span>
                      <span className="text-[9px] font-mono text-orange-400">{dep.gasUsed.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Side Inspector Panel (Inspired by KeeperHub flyout panel layout) */}
      {selectedNode && (
        <div className="inspector-panel absolute top-0 right-0 h-full w-80 bg-[#1e1e1e] border-l border-[#333] shadow-2xl flex flex-col z-20">
          <div className="p-4 border-b border-[#2d2d2d] bg-[#252526] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedNode.type === 'wallet' ? <Wallet className="size-4 text-blue-400" /> : <Database className="size-4 text-green-400" />}
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{selectedNode.label}</span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {selectedNode.type === 'wallet' ? (
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">Wallet Address</span>
                <div className="bg-[#141414] p-2 rounded border border-[#2d2d2d] font-mono text-[10px] break-all text-blue-300">{selectedNode.id}</div>
              </div>
              <div className="bg-[#141414] p-3 rounded border border-[#2d2d2d] flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Live Balance:</span>
                <span className="text-sm font-bold text-yellow-500">{parseFloat(selectedNode.data?.balance || '0').toFixed(6)} ETH</span>
              </div>
              <div className="text-[10px] text-gray-500 leading-relaxed bg-[#252526] border border-blue-900/30 p-2.5 rounded">
                <Info className="size-3 text-blue-400 inline mr-1 mb-0.5" />
                This is a local simulated account loaded inside your browser EVM. It can be used to sign and fire transactions to test contracts instantly.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden text-xs">
              {/* Tab Selector */}
              <div className="flex border-b border-[#2d2d2d] bg-[#1a1a1a]">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-2 text-[10px] uppercase font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'info' ? 'border-green-500 text-white bg-[#1e1e1e]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button 
                  onClick={() => setActiveTab('interact')}
                  className={`flex-1 py-2 text-[10px] uppercase font-bold text-center border-b-2 transition-colors ${
                    activeTab === 'interact' ? 'border-green-500 text-white bg-[#1e1e1e]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Quick Call
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'info' && (
                  <>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-500">Contract Address</span>
                      <div className="bg-[#141414] p-2 rounded border border-[#2d2d2d] font-mono text-[10px] break-all text-green-300">
                        {selectedNode.id}
                      </div>
                      {selectedNode.data?.isRealChain && (
                        <a 
                          href={selectedNode.data?.network?.toLowerCase().includes('sepolia') 
                            ? `https://sepolia.etherscan.io/address/${selectedNode.id}` 
                            : `https://etherscan.io/address/${selectedNode.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold mt-1 uppercase"
                        >
                          <Link className="size-3" /> View on Etherscan
                        </a>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="bg-[#141414] p-2.5 rounded border border-[#2d2d2d] space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Deployed Block:</span>
                          <span className="font-mono text-gray-200">#{selectedNode.data?.blockNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Gas Expended:</span>
                          <span className="font-mono text-orange-400">{selectedNode.data?.gasUsed?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Network:</span>
                          <span className="font-bold text-green-400">{selectedNode.data?.network}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      {onInteract && (
                        <button
                          type="button"
                          onClick={() => onInteract(selectedNode.data)}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-green-600/20 text-green-300 border border-green-500/40 rounded hover:bg-green-600/30 transition-all text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Activity className="h-3.5 w-3.5" />
                          Open in Interaction Panel
                        </button>
                      )}
                      {onPromote && !selectedNode.data?.isRealChain && (
                        <button
                          type="button"
                          onClick={() => onPromote(selectedNode.data)}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-all text-[10px] font-bold uppercase tracking-wider"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Promote to MetaMask
                        </button>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'interact' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Signing Account</label>
                      <select 
                        value={simSelectedWallet}
                        onChange={(e) => setSimSelectedWallet(e.target.value)}
                        className="w-full bg-[#141414] border border-[#333] rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-green-500 font-mono"
                      >
                        {accounts.map((acc, index) => (
                          <option key={acc} value={acc}>Account #{index} ({acc.slice(0, 8)}...)</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Calldata (Hex)</label>
                      <textarea
                        value={simCalldata}
                        onChange={(e) => setSimCalldata(e.target.value)}
                        placeholder="e.g. 0x6057361d..."
                        rows={3}
                        className="w-full bg-[#141414] border border-[#333] rounded p-2 text-xs text-gray-300 font-mono focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Value (Wei)</label>
                        <input
                          type="text"
                          value={simValue}
                          onChange={(e) => setSimValue(e.target.value)}
                          className="w-full bg-[#141414] border border-[#333] rounded p-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500">Gas Limit</label>
                        <input
                          type="text"
                          value={simGasLimit}
                          onChange={(e) => setSimGasLimit(e.target.value)}
                          className="w-full bg-[#141414] border border-[#333] rounded p-1.5 text-xs text-gray-300 font-mono focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => executeSimulatedTx(selectedNode.id)}
                      disabled={isExecutingTx}
                      className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold uppercase tracking-wider text-[10px] transition-all disabled:opacity-55"
                    >
                      {isExecutingTx ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5 fill-current" />
                      )}
                      Execute Call
                    </button>

                    {/* Tx Logs */}
                    {txLogs.length > 0 && (
                      <div className="space-y-1 border-t border-[#2d2d2d] pt-3">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Execution Status</span>
                        <div className="bg-[#141414] border border-[#2d2d2d] rounded p-2.5 font-mono text-[9px] text-gray-400 space-y-1 max-h-36 overflow-y-auto">
                          {txLogs.map((log, i) => (
                            <div key={i} className={log.includes('Successful') ? 'text-green-400' : log.includes('Revert') ? 'text-red-400' : ''}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimulatedChain;