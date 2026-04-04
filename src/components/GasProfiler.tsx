import React from 'react';
import { Flame, FileCode, AlertTriangle } from 'lucide-react';

interface GasProfilerProps {
  lineGasMap?: Map<number, number>;
  totalGas?: number;
  isProfiling?: boolean;
}

const GasProfiler: React.FC<GasProfilerProps> = ({ lineGasMap = new Map(), totalGas = 0, isProfiling = false }) => {
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

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden select-none border-l border-[#2d2d2d] w-[300px]">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
          <Flame className="size-3.5" />
          Gas Profiler
        </span>
      </div>

      {isProfiling ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
            <Flame className="size-10 text-orange-500 animate-pulse relative z-10" />
          </div>
          <p className="text-xs text-gray-400 font-mono">Profiling Execution Trace...</p>
        </div>
      ) : !totalGas || lineGasMap.size === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 opacity-50">
          <FileCode className="size-10 text-gray-400" />
          <p className="text-xs text-gray-400">Run a transaction in the interaction panel to generate deep gas profiles.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="bg-[#252526] p-3 rounded border border-[#333] flex flex-col items-center justify-center">
            <span className="text-[9px] uppercase font-bold text-gray-500">Total Execution Gas</span>
            <span className="text-xl font-mono text-white">{totalGas.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-2 mb-3">
              <AlertTriangle className="size-3 text-red-400" />
              Most Expensive Lines
            </h4>
            
            <div className="space-y-1">
              {sortedLines.slice(0, 10).map((item) => (
                <div key={item.line} className={`flex items-center justify-between p-2 rounded border-l-2 ${getHeatmapColor(item.gas)}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-60">Line {item.line}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold">{item.gas.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GasProfiler;
