import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar
} from 'recharts';
import { 
  ShieldAlert, 
  Zap, 
  Database, 
  TrendingUp, 
  DollarSign, 
  Info,
  ChevronRight
} from 'lucide-react';
import { SecurityReport } from '../utils/securityScanner';
import { CompilationResult } from '../utils/hardhatCompiler';
import { analyzeStorageLayout } from '../utils/StorageAnalyzer';

interface AnalyticsSidebarProps {
  compileResult?: CompilationResult;
  sourceCode?: string;
  securityReport?: SecurityReport | null;
}

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({ compileResult, sourceCode, securityReport }) => {

  const radarData = React.useMemo(() => {
    let access = 100, reentrancy = 100, logic = 100, arithmetic = 100, gas = 100;
    
    securityReport?.findings.forEach(f => {
      const penalty = f.severity === 'High' ? 35 : f.severity === 'Medium' ? 20 : 8;
      
      // Access Control
      if (['S002', 'S013', 'SWC-112'].includes(f.id)) access -= penalty;
      
      // Reentrancy
      if (f.id === 'S001') reentrancy -= penalty;
      
      // Logic & Safety
      if (['S004', 'S015', 'SWC-132', 'SWC-104'].includes(f.id)) logic -= penalty;
      
      // Arithmetic
      if (['S003', 'S008'].includes(f.id)) arithmetic -= penalty;
      
      // Gas & Optimization
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

  const gasData = React.useMemo(() => {
    if (!compileResult?.abi) return [];
    
    // Create logic-based gas distribution
    return (compileResult.abi as any[])
      .filter((item: any) => item.type === 'function')
      .map((func: any) => {
        let base = 2500; // default pure/view gas
        
        if (func.stateMutability === 'payable') {
            base = 45000; // Base cost for payable
        } else if (func.stateMutability === 'nonpayable' || !func.stateMutability) {
            base = 25000; // Base cost for state modifying
        } else if (func.stateMutability === 'view') {
            base = 4200; // Base cost for view
        }
        
        // Add overhead for parameters
        const paramGas = (func.inputs?.length || 0) * 1200;

        // More complex logic approximations if source code is available
        let complexityOverhead = 0;
        if (sourceCode) {
            const funcRegex = new RegExp(`function\\s+${func.name}\\s*\\(`, 'g');
            if (funcRegex.test(sourceCode)) {
                // If it's a deposit or withdraw, add typical state change gas
                if (['deposit', 'withdraw', 'transfer', 'mint', 'burn'].includes(func.name.toLowerCase())) {
                    complexityOverhead += 20000; // Typical SSTORE overhead
                }
            }
        }
        
        return {
          name: func.name,
          gas: base + paramGas + complexityOverhead
        };
      });
  }, [compileResult, sourceCode]);

  const storageMap = React.useMemo(() => {
    if (!sourceCode) return null;
    return analyzeStorageLayout(sourceCode);
  }, [sourceCode]);

  const safetyScore = securityReport?.score ?? 100;
  return (
    <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] overflow-hidden select-none border-r border-[#2d2d2d]">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between bg-[#1e1e1e]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#858585]">Forensic Analytics</span>
        <TrendingUp className="size-3.5 text-blue-400" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
        
        {/* Security Radar */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-500">
            <ShieldAlert className="size-3 text-red-500" />
            Security Risk Profile
          </div>
          <div className="h-48 w-full bg-[#1e1e1e] rounded border border-[#333] p-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 8 }} />
                <Radar
                  name="Safety"
                  dataKey="A"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] flex flex-col">
              <span className="text-[8px] uppercase font-bold text-gray-500">Safety Score</span>
              <span className={`text-sm font-mono ${safetyScore > 80 ? 'text-green-500' : safetyScore > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                {safetyScore.toFixed(0)}/100
              </span>
            </div>
            <div className="bg-[#1e1e1e] p-2 rounded border border-[#333] flex flex-col">
              <span className="text-[8px] uppercase font-bold text-gray-500">Vulnerabilities</span>
              <span className="text-sm font-mono text-orange-500">{securityReport?.findings.length || 0} Found</span>
            </div>
          </div>
        </section>

        {/* Gas Distribution */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-500">
            <Zap className="size-3 text-yellow-500" />
            Gas Usage Distribution
          </div>
          <div className="h-40 w-full bg-[#1e1e1e] rounded border border-[#333] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gasData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fill: '#888', fontSize: 9 }} width={50} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333', fontSize: '10px' }}
                  itemStyle={{ color: '#ccc' }}
                />
                <Bar dataKey="gas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Cost Projection */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-500">
            <DollarSign className="size-3 text-green-500" />
            Market Cost Projection
          </div>
          <div className="space-y-2">
            <div className="bg-[#1e1e1e] p-3 rounded border border-[#333] group hover:border-[#007acc] transition-colors shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-gray-400">Ethereum Mainnet</span>
                <span className="text-[9px] text-green-500 font-mono">
                  ${((compileResult?.gasEstimate || 0) * 30 * 1e-9 * 2500).toFixed(2)}
                </span>
              </div>
              <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (compileResult?.gasEstimate || 0) / 10000)}%` }} />
              </div>
              <div className="mt-2 text-[8px] text-gray-500 flex justify-between">
                <span>Gas: 32 Gwei</span>
                <span>Type: Medium</span>
              </div>
            </div>
            <div className="bg-[#1e1e1e] p-3 rounded border border-[#333] group hover:border-[#007acc] transition-colors shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-gray-400">Base L2</span>
                <span className="text-[9px] text-green-500 font-mono">
                  ${((compileResult?.gasEstimate || 0) * 0.01 * 1e-9 * 2500).toFixed(4)}
                </span>
              </div>
              <div className="mt-1 text-[8px] text-gray-500 flex items-center justify-between">
                <span className="px-1 py-0.5 bg-green-500/10 text-green-400 rounded">99.8% Cheaper</span>
                <ChevronRight className="size-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Storage Map Map */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-gray-500">
            <Database className="size-3 text-purple-500" />
            Storage Slot Map
          </div>
          {storageMap && storageMap.totalSlots > 0 ? (
            <>
              <div className="grid grid-cols-8 gap-1 p-2 bg-[#1e1e1e] rounded border border-[#333]">
                {Array.from({ length: Math.min(32, storageMap.totalSlots + 1) }).map((_, i) => {
                  const isUnpacked = storageMap.unpackedSlots.includes(i);
                  const isOccupied = i < storageMap.totalSlots;
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-sm text-[8px] flex items-center justify-center border transition-all cursor-help
                        ${isUnpacked ? 'bg-orange-900/40 border-orange-500/50 text-orange-200' : 
                          isOccupied ? 'bg-purple-900/40 border-purple-500/50 text-purple-200' : 
                          'bg-gray-800/30 border-gray-700 text-gray-600'}
                      `}
                      title={isUnpacked ? `Slot ${i}: Unpacked` : isOccupied ? `Slot ${i}: Occupied` : `Slot ${i}: Empty`}
                    >
                      {i}
                    </div>
                  );
                })}
              </div>
              <div className={`flex items-start gap-2 border p-2 rounded ${storageMap.unpackedSlots.length > 0 ? 'bg-orange-900/10 border-orange-800/30' : 'bg-blue-900/10 border-blue-800/30'}`}>
                <Info className={`size-3 mt-0.5 flex-shrink-0 ${storageMap.unpackedSlots.length > 0 ? 'text-orange-400' : 'text-blue-400'}`} />
                <p className={`text-[9px] leading-tight ${storageMap.unpackedSlots.length > 0 ? 'text-orange-300' : 'text-blue-300'}`}>
                  {storageMap.totalSlots} slots actively used. 
                  {storageMap.unpackedSlots.length > 0 ? ` ${storageMap.unpackedSlots.length} unpacked slot(s) found. Optimization recommended.` : ' Slot packing is optimal.'}
                </p>
              </div>
            </>
          ) : (
             <div className="text-center p-4 text-[10px] text-gray-500 border border-[#333] rounded">No state variables mapping found.</div>
          )}
        </section>

      </div>
    </div>
  );
};

export default AnalyticsSidebar;
