import React, { useState } from 'react';
import { Network, ChevronRight, ChevronDown } from 'lucide-react';

export interface CallFrame {
  type: string; // CALL, DELEGATECALL, STATICCALL
  from: string;
  to: string;
  value: string;
  gas: number;
  gasUsed: number;
  input: string;
  output: string;
  calls?: CallFrame[];
}

interface CallTraceVisualizerProps {
  traceTree: CallFrame;
}

const CallFrameNode: React.FC<{ frame: CallFrame; depth?: number }> = ({ frame, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = frame.calls && frame.calls.length > 0;

  return (
    <div className="w-full font-mono text-[10px]">
      <div 
        className={`flex items-center gap-1.5 p-1.5 rounded transition-colors group ${depth === 0 ? 'bg-gray-800 border border-gray-700' : 'hover:bg-gray-900'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-300">
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <div className="size-3" /> // spacer
        )}
        
        <span className={`px-1 rounded text-[8px] font-bold ${
          frame.type === 'DELEGATECALL' ? 'bg-purple-900/50 text-purple-400' :
          frame.type === 'STATICCALL' ? 'bg-teal-900/50 text-teal-400' :
          'bg-blue-900/50 text-blue-400'
        }`}>
          {frame.type}
        </span>
        
        <span className="text-gray-400">to</span>
        <span className="text-green-400">{frame.to.slice(0, 8)}...</span>
        
        <span className="opacity-0 group-hover:opacity-100 text-gray-600 transition-opacity ml-auto flex items-center gap-2">
          {frame.value !== '0' && <span className="text-yellow-500/70">{frame.value} wei</span>}
          <span className="text-orange-500/70">{frame.gasUsed.toLocaleString()} gas</span>
        </span>
      </div>

      {expanded && hasChildren && (
        <div className="border-l border-gray-800 ml-3 mt-1 space-y-1">
          {frame.calls!.map((child, i) => (
            <CallFrameNode key={i} frame={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const CallTraceVisualizer: React.FC<CallTraceVisualizerProps> = ({ traceTree }) => {
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden mt-3">
      <div className="px-3 py-2 border-b border-[#333] bg-[#252526] flex items-center gap-2">
        <Network className="size-3 text-cyan-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Execution Call Tree</span>
      </div>
      <div className="p-2 overflow-x-auto custom-scrollbar">
        {traceTree ? (
          <CallFrameNode frame={traceTree} />
        ) : (
          <div className="text-center p-4 text-[10px] text-gray-500 italic">No internal calls detected.</div>
        )}
      </div>
    </div>
  );
};

export default CallTraceVisualizer;
