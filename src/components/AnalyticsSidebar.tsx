import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Zap, 
  Database, 
  DollarSign, 
  Info, 
  ChevronRight,
  Cpu,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import { isAbiFunction, asAbiArray } from '../types/abi';
import { CompilationResult } from '../utils/hardhatCompiler';
import { SecurityReport } from '../utils/securityScanner';
import { analyzeStorageLayout } from '../utils/StorageAnalyzer';
import { priceService } from '../utils/PriceService';
import { COMPILER_VERSIONS } from '../utils/compilerVersions';

interface MeasurementGateProps {
  children: React.ReactNode;
  minHeight?: number;
}

/**
 * Hardware-accelerated guard for Recharts.
 * Physically blocks mounting until the container has a stable, non-zero pixel area.
 * Includes a 250ms "settle" delay to wait for sidebar slide-in animations to finish.
 */
const MeasurementGate: React.FC<MeasurementGateProps> = ({ children, minHeight = 180 }) => {
  const [isStable, setIsStable] = useState(false);
  const [hasWidth, setHasWidth] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setHasWidth(true);
      } else {
        setHasWidth(false);
        setIsStable(false);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hasWidth && !isStable) {
      const timer = setTimeout(() => setIsStable(true), 250);
      return () => clearTimeout(timer);
    }
  }, [hasWidth, isStable]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight }}>
      {isStable ? children : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]/20 rounded-xl">
          <Activity className="size-4 text-[#333] animate-pulse" />
        </div>
      )}
    </div>
  );
};

interface AnalyticsSidebarProps {
  compileResult?: CompilationResult;
  sourceCode?: string;
  securityReport?: SecurityReport | null;
  currentVersion?: string;
  onVersionChange?: (version: string) => void;
  isCompiled?: boolean;
}

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({ 
  compileResult, 
  sourceCode, 
  securityReport,
  currentVersion = '0.8.20',
  onVersionChange,
  isCompiled = false
}) => {
  const [marketData, setMarketData] = useState<{ eth_usd: number; gas_price_gwei: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await priceService.getLatestData();
      setMarketData(data);
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const radarData = useMemo(() => {
    let access = 100, reentrancy = 100, logic = 100, arithmetic = 100, gas = 100;
    
    securityReport?.findings.forEach(f => {
      const penalty = f.severity === 'High' ? 35 : f.severity === 'Medium' ? 20 : 8;
      if (['S002', 'S013', 'SWC-112'].includes(f.id)) access -= penalty;
      if (f.id === 'S001') reentrancy -= penalty;
      if (['S004', 'S015', 'SWC-132', 'SWC-104'].includes(f.id)) logic -= penalty;
      if (['S003', 'S008'].includes(f.id)) arithmetic -= penalty;
      if (['S005', 'S006', 'S007'].includes(f.id)) gas -= penalty;
    });

    return [
      { subject: 'Access Control', A: Math.max(0, access), fullMark: 100 },
      { subject: 'Reentrancy', A: Math.max(0, reentrancy), fullMark: 100 },
      { subject: 'Logic', A: Math.max(0, logic), fullMark: 100 },
      { subject: 'Arithmetic', A: Math.max(0, arithmetic), fullMark: 100 },
      { subject: 'Gas', A: Math.max(0, gas), fullMark: 100 },
    ];
  }, [securityReport]);

  const gasData = useMemo(() => {
    if (!compileResult?.abi) return [];
    const abi = asAbiArray(compileResult.abi);
    return abi
      .filter(isAbiFunction)
      .filter((item) => {
        const name = item.name;
        const isAllCaps = name === name.toUpperCase() && name.includes('_');
        const isMetadata = ['eip712Domain', 'DOMAIN_SEPARATOR', 'CLOCK_MODE', 'clock'].includes(name);
        return !isAllCaps && !isMetadata;
      })
      .map((func) => {
        let base = 21000; 
        if (func.stateMutability === 'payable') base = 45000;
        else if (func.stateMutability === 'nonpayable' || !func.stateMutability) base = 25000;
        else if (func.stateMutability === 'view') base = 0; 
        
        const paramGas = (func.inputs?.length || 0) * 1200;
        let complexityOverhead = 0;
        if (sourceCode) {
            if (['deposit', 'withdraw', 'transfer', 'mint', 'burn'].includes(func.name.toLowerCase())) {
                complexityOverhead += 20000;
            }
        }
        return { name: func.name, gas: base + paramGas + complexityOverhead };
      });
  }, [compileResult, sourceCode]);

  const storageMap = useMemo(() => {
    if (!sourceCode) return null;
    return analyzeStorageLayout(sourceCode);
  }, [sourceCode]);

  const safetyScore = securityReport?.score ?? 100;
  const currentEthPrice = marketData?.eth_usd || 3000;
  const currentGasGwei = marketData?.gas_price_gwei || 25;

  const isDirty = !isCompiled && !!compileResult;

  return (
    <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] overflow-hidden select-none border-r border-[#2d2d2d]">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1a1a1c]/60 backdrop-blur-xl">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#007acc] drop-shadow-[0_0_8px_rgba(0,122,204,0.3)]">Forensic Analytics</span>
        <Activity className="size-3.5 text-blue-400 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
        
        {/* Compiler Settings Section - Always Visible */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400">
            <Cpu className="size-3 text-blue-500" />
            Toolchain Configuration
          </div>
          <div className="bg-[#1e1e1e] p-3 rounded border border-[#333] space-y-2">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Solidity Version</label>
            <select 
              value={currentVersion}
              onChange={(e) => onVersionChange?.(e.target.value)}
              className="w-full bg-[#2d2d2d] border border-[#444] rounded px-2 py-1.5 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-[#007acc] appearance-none cursor-pointer"
            >
              {Object.keys(COMPILER_VERSIONS).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <p className="text-[8px] text-gray-600 italic">Version shifts automatically if pragma is detected.</p>
          </div>
        </section>

        {!isCompiled ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 opacity-80 group animate-in fade-in duration-700">
            <div className="relative">
              <div className={`absolute inset-0 blur-2xl rounded-full transition-all duration-1000 ${isDirty ? 'bg-orange-500/20' : 'bg-blue-500/10'}`} />
              <div className={`relative z-10 size-20 rounded-3xl border flex items-center justify-center shadow-2xl transition-all duration-500 ${isDirty ? 'border-orange-500/30 bg-orange-950/20' : 'border-blue-500/20 bg-blue-950/10'}`}>
                {isDirty ? (
                  <ShieldAlert className="size-10 text-orange-500 animate-pulse" />
                ) : (
                  <Zap className="size-10 text-blue-500" />
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className={`text-[12px] font-black uppercase tracking-[0.2em] ${isDirty ? 'text-orange-400' : 'text-gray-400'}`}>
                {isDirty ? 'Re-compilation Required' : 'Compilation Required'}
              </h4>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium px-4">
                {isDirty 
                  ? 'Your source code has changed. The existing analysis is now stale. Re-compile to update security and gas metrics.' 
                  : 'High-fidelity forensic analysis and security risk profiles are generated once your contract is successfully compiled.'}
              </p>
            </div>
            <button 
              onClick={() => document.getElementById('trigger-compile-btn')?.click()}
              className={`px-6 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-3 active:scale-95 shadow-lg ${
                isDirty 
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 shadow-orange-950/20' 
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 shadow-blue-950/20'
              }`}
            >
              <Cpu className="size-3.5" />
              {isDirty ? 'Refresh Metrics' : 'Generate Metrics'}
            </button>
          </div>
        ) : (
          <>
            {/* Security Radar Section */}
            <section className="space-y-3 min-h-[200px] animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                <ShieldAlert className="size-3 text-red-500" />
                Security Risk Profile
              </div>
              <div className="w-full h-56 bg-white/[0.02] backdrop-blur-2xl rounded-2xl border border-white/10 relative overflow-hidden shadow-2xl group transition-all hover:border-blue-500/40">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 p-4">
                  <MeasurementGate minHeight={180}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="55%" data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="#ffffff0a" strokeDasharray="3 3" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#aaa', fontSize: 10, fontWeight: 700 }} 
                        />
                        <Radar
                          name="Audit"
                          dataKey="A"
                          stroke="#007acc"
                          fill="#007acc"
                          fillOpacity={0.15}
                          animationBegin={300}
                          animationDuration={1500}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </MeasurementGate>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col group hover:border-blue-500/20 transition-all">
                  <span className="text-[8px] uppercase font-black tracking-widest text-gray-500 mb-1">Safety Score</span>
                  <span className={`text-base font-black font-mono drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] ${safetyScore > 80 ? 'text-green-500' : safetyScore > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                    {safetyScore.toFixed(0)}%
                  </span>
                </div>
                <div className="bg-white/[0.03] backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col group hover:border-orange-500/20 transition-all">
                  <span className="text-[8px] uppercase font-black tracking-widest text-gray-500 mb-1">Anomalies</span>
                  <span className="text-base font-black font-mono text-orange-500 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">{securityReport?.findings.length || 0} Detected</span>
                </div>
              </div>
            </section>

            {/* Gas Distribution */}
            <section className="space-y-3 min-h-[160px] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                <Zap className="size-3 text-yellow-500" />
                Gas Usage Distribution
              </div>
              <div className="w-full h-40 bg-[#1e1e1e]/50 backdrop-blur-md rounded-xl border border-white/5 relative overflow-hidden group shadow-inner">
                <div className="absolute inset-0 p-3 overflow-y-auto custom-scrollbar-hidden">
                  <MeasurementGate minHeight={120}>
                    <ResponsiveContainer width="100%" height={Math.max(120, gasData.length * 30)}>
                      <BarChart data={gasData} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fill: '#999', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }} 
                          width={95} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ 
                            backgroundColor: '#161618', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '8px',
                            fontSize: '10px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' 
                          }}
                          itemStyle={{ color: '#007acc', fontWeight: 'bold' }}
                          labelStyle={{ color: '#888', marginBottom: '4px' }}
                        />
                        <Bar 
                          dataKey="gas" 
                          fill="#007acc" 
                          radius={[0, 6, 6, 0]} 
                          barSize={12}
                          animationBegin={500}
                          animationDuration={1200}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </MeasurementGate>
                </div>
              </div>
            </section>

            {/* Cost Projection */}
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                <DollarSign className="size-3 text-green-500" />
                Market Cost Projection
              </div>
              <div className="space-y-2">
                <div className="bg-[#1e1e1e] p-3 rounded border border-[#333] group hover:border-[#007acc] transition-colors shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-gray-400">Ethereum Mainnet</span>
                    <span className="text-[9px] text-green-500 font-mono">
                      ${((compileResult?.gasEstimate || 0) * currentGasGwei * 1e-9 * currentEthPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (compileResult?.gasEstimate || 0) / 10000)}%` }} />
                  </div>
                  <div className="mt-2 text-[8px] text-gray-500 flex justify-between">
                    <span>Gas: {currentGasGwei.toFixed(0)} Gwei</span>
                    <span>Type: {currentGasGwei > 50 ? 'High' : currentGasGwei > 20 ? 'Medium' : 'Low'}</span>
                  </div>
                </div>
                <div className="bg-[#1e1e1e] p-3 rounded border border-[#333] group hover:border-[#007acc] transition-colors shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-gray-400">Base L2</span>
                    <span className="text-[9px] text-green-500 font-mono">
                      ${((compileResult?.gasEstimate || 0) * priceService.getL2GasPrice(currentGasGwei, 'base') * 1e-9 * currentEthPrice).toFixed(4)}
                    </span>
                  </div>
                  <div className="mt-1 text-[8px] text-gray-500 flex items-center justify-between">
                    <span className="px-1 py-0.5 bg-green-500/10 text-green-400 rounded">
                      {((1 - (priceService.getL2GasPrice(currentGasGwei, 'base') / currentGasGwei)) * 100).toFixed(1)}% Cheaper
                    </span>
                    <ChevronRight className="size-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>

            {/* Storage Slot Map */}
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                  <Database className="size-3 text-purple-500" />
                  Storage Slot Map
                </div>
                {storageMap && storageMap.totalSlots > 0 && (
                  <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                    {storageMap.totalSlots} slot{storageMap.totalSlots !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {storageMap && storageMap.variables.length > 0 ? (
                <div className="space-y-1.5">
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 px-1 pb-1">
                    {[
                      { label: 'Value', color: 'bg-purple-500' },
                      { label: 'Mapping', color: 'bg-blue-500' },
                      { label: 'Array', color: 'bg-cyan-500' },
                      { label: 'Struct', color: 'bg-orange-500' },
                      { label: 'String/Bytes', color: 'bg-pink-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1">
                        <div className={`size-1.5 rounded-full ${item.color}`} />
                        <span className="text-[8px] text-gray-500 font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Per-slot rows */}
                  {(() => {
                    // Group variables by slot
                    const slotMap = new Map<number, typeof storageMap.variables>();
                    storageMap.variables.forEach(v => {
                      if (!slotMap.has(v.slot)) slotMap.set(v.slot, []);
                      slotMap.get(v.slot)!.push(v);
                    });

                    return Array.from(slotMap.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([slotIdx, slotVars]) => {
                        const totalBytes = slotVars.reduce((s, v) => s + Math.min(v.byteSize, 32), 0);
                        const fillPct = Math.min(100, (totalBytes / 32) * 100);
                        const isUnpacked = storageMap.unpackedSlots.includes(slotIdx);

                        const catColor = (cat: string) => {
                          switch (cat) {
                            case 'mapping': return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
                            case 'array':   return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
                            case 'struct':  return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
                            case 'string':  return 'bg-pink-500/20 border-pink-500/40 text-pink-300';
                            default:        return 'bg-purple-500/20 border-purple-500/40 text-purple-300';
                          }
                        };

                        const barColor = isUnpacked
                          ? 'bg-orange-500'
                          : fillPct >= 100
                            ? 'bg-purple-500'
                            : 'bg-blue-500';

                        return (
                          <div
                            key={slotIdx}
                            className={`bg-[#1a1a1c] rounded-lg border p-2.5 space-y-2 transition-all hover:border-white/10 ${
                              isUnpacked ? 'border-orange-500/20' : 'border-white/5'
                            }`}
                          >
                            {/* Slot header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-gray-600 font-mono uppercase">
                                  Slot {slotIdx}
                                </span>
                                <span className="text-[8px] font-mono text-gray-700">
                                  0x{slotIdx.toString(16).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-bold ${isUnpacked ? 'text-orange-400' : totalBytes >= 32 ? 'text-purple-400' : 'text-gray-500'}`}>
                                  {totalBytes}/{32}B
                                </span>
                                {isUnpacked && (
                                  <span className="text-[7px] font-black text-orange-400 uppercase tracking-wider border border-orange-500/30 px-1 rounded">
                                    Pack
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Byte fill bar */}
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>

                            {/* Variable chips */}
                            <div className="flex flex-wrap gap-1">
                              {slotVars.map(v => (
                                <div
                                  key={v.name}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-bold ${catColor(v.category)}`}
                                  title={`${v.name}: ${v.type} (${v.byteSize}B @ offset ${v.offset})`}
                                >
                                  <span className="font-mono">{v.name}</span>
                                  <span className="opacity-50">·</span>
                                  <span className="opacity-70 font-normal truncate max-w-[60px]">{v.type}</span>
                                  <span className="opacity-40 text-[7px]">{Math.min(v.byteSize, 32)}B</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                  })()}

                  {/* Summary banner */}
                  <div className={`flex items-start gap-2 border p-2 rounded mt-2 ${storageMap.unpackedSlots.length > 0 ? 'bg-orange-900/10 border-orange-800/30' : 'bg-green-900/10 border-green-800/20'}`}>
                    <Info className={`size-3 mt-0.5 flex-shrink-0 ${storageMap.unpackedSlots.length > 0 ? 'text-orange-400' : 'text-green-400'}`} />
                    <p className={`text-[9px] leading-tight ${storageMap.unpackedSlots.length > 0 ? 'text-orange-300' : 'text-green-300'}`}>
                      {storageMap.totalSlots} slot{storageMap.totalSlots !== 1 ? 's' : ''} used across {storageMap.variables.length} state variable{storageMap.variables.length !== 1 ? 's' : ''}.{' '}
                      {storageMap.unpackedSlots.length > 0
                        ? `${storageMap.unpackedSlots.length} slot(s) have unused space — reorder variables by size to pack tighter.`
                        : 'Slot packing is optimal.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 text-[10px] text-gray-500 border border-[#333] rounded">
                  No state variables found.
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </div>
  );
};

export default AnalyticsSidebar;
