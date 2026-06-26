import React from 'react';
import { Flame, FileCode, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { HeatmapQuality } from '../utils/traceMapper';
import CallTraceVisualizer from './CallTraceVisualizer';
import { CallFrame } from '../utils/browserVM';

interface GasProfilerProps {
  lineGasMap?: Map<number, number>;
  totalGas?: number;
  isProfiling?: boolean;
  quality?: HeatmapQuality;
  unmappedGas?: number;
  traceTree?: CallFrame;
}

const GasProfiler: React.FC<GasProfilerProps> = ({
  lineGasMap = new Map(),
  totalGas = 0,
  isProfiling = false,
  quality = 'accurate',
  unmappedGas = 0,
  traceTree,
}) => {
  // Convert Map to array and sort by most expensive lines
  const sortedLines = Array.from(lineGasMap.entries())
    .map(([line, gas]) => ({ line, gas }))
    .sort((a, b) => b.gas - a.gas);

  const maxGas = sortedLines.length > 0 ? sortedLines[0].gas : 1;

  const getHeatmapColor = (gas: number) => {
    const ratio = gas / maxGas;
    if (ratio > 0.8) return 'bg-red-500/20 text-red-400 border-red-500';
    if (ratio > 0.4) return 'bg-orange-500/20 text-orange-400 border-orange-500';
    if (ratio > 0.1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  const unmappedPct = totalGas > 0 ? Math.round((unmappedGas / totalGas) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden select-none border-l border-[#2d2d2d] w-[300px]">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
          <Flame className="size-3.5" />
          Gas Profiler
        </span>
        {quality === 'partial' && (
          <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full">
            Partial
          </span>
        )}
        {quality === 'accurate' && totalGas > 0 && (
          <span className="text-[8px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
            Accurate
          </span>
        )}
      </div>

      {isProfiling ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative z-10 size-16 bg-[#252526] rounded-2xl border border-orange-500/30 flex items-center justify-center shadow-2xl">
              <Flame className="size-8 text-orange-500 animate-bounce" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] animate-pulse">Analyzing Trace...</p>
        </div>

      ) : quality === 'unavailable' ? (
        /* ── Proxy / delegatecall: heatmap would be wrong, show explanation instead ── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full" />
            <div className="relative z-10 size-16 bg-[#252526] rounded-2xl border border-amber-500/30 flex items-center justify-center shadow-2xl">
              <ShieldAlert className="size-8 text-amber-400" />
            </div>
          </div>
          <div className="space-y-2 px-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Heatmap Unavailable</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              This transaction routes most of its execution through a <span className="text-amber-300 font-bold">proxy or delegatecall</span> pattern.
            </p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Attributing that gas to the outer contract's source lines would produce misleading hotspots. No data is better than wrong data.
            </p>
          </div>
          <div className="w-full bg-[#252526] border border-amber-500/20 rounded-lg p-3 text-left space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Gas summary</p>
            <p className="text-[10px] text-gray-400 font-mono">Total: <span className="text-white">{totalGas.toLocaleString()}</span></p>
            <p className="text-[10px] text-gray-400 font-mono">In subcalls: <span className="text-amber-400">{unmappedGas.toLocaleString()} ({unmappedPct}%)</span></p>
          </div>
        </div>

      ) : !totalGas || lineGasMap.size === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-30 group translate-y-4 animate-in fade-in fill-mode-forwards duration-700">
          <div className="size-16 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 group-hover:border-orange-500/20 transition-colors">
            <FileCode className="size-8 text-gray-600 group-hover:text-orange-950 transition-colors" />
          </div>
          <div className="space-y-1">
             <p className="text-[11px] font-bold text-gray-300">No Execution Data</p>
             <p className="text-[9px] text-gray-500 leading-relaxed px-4">Execute a function in the Interaction Panel to visualize gas hotspots and bottlenecks.</p>
          </div>
        </div>

      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="bg-[#252526] p-4 rounded-xl border border-white/5 relative overflow-hidden shadow-2xl group">
             <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
             <div className="relative z-10 flex flex-col items-center justify-center">
               <span className="text-[8px] uppercase font-black tracking-widest text-orange-500/60 mb-1">Compute Capacity</span>
               <span className="text-2xl font-mono text-white tracking-tighter tabular-nums drop-shadow-md">{totalGas.toLocaleString()}</span>
               <span className="text-[8px] uppercase font-bold text-gray-600 mt-1">Gas Units</span>
             </div>
          </div>

          {/* Partial quality note */}
          {quality === 'partial' && unmappedGas > 0 && (
            <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 animate-in fade-in duration-300">
              <Info className="size-3 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-[9px] text-yellow-300/70 leading-relaxed">
                <span className="font-black text-yellow-400">~{unmappedPct}% unmapped</span> — gas from cross-contract calls or inline assembly cannot be attributed to a source line.
              </p>
            </div>
          )}
 
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[9px] uppercase font-black tracking-[0.15em] text-gray-500 flex items-center gap-2">
                <AlertTriangle className="size-3 text-orange-400" />
                Hotspots
              </h4>
              <span className="text-[8px] font-bold text-gray-700">{sortedLines.length} Nodes</span>
            </div>
            
            <div className="space-y-1.5">
              {sortedLines.slice(0, 10).map((item, idx) => (
                <div 
                  key={item.line} 
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-default group ${getHeatmapColor(item.gas)}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-1.5 rounded-full ${item.gas / maxGas > 0.6 ? 'animate-pulse bg-current' : 'bg-current opacity-40'}`} />
                    <span className="text-[10px] font-bold tracking-tight">Line {item.line}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black tabular-nums">{item.gas.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {traceTree && (
              <div className="pt-2">
                <CallTraceVisualizer traceTree={traceTree} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GasProfiler;
