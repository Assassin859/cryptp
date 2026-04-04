import React, { useState } from 'react';
import { SecurityReport } from '../utils/securityScanner';
import { ShieldCheck, ShieldAlert, ShieldX, Info, CheckCircle2, AlertTriangle, ExternalLink, Zap, ClipboardCheck } from 'lucide-react';
import SecurityChecklist from './SecurityChecklist';

interface SecurityAuditProps {
  report: SecurityReport | null;
  isScanning: boolean;
  hasCompileError?: boolean;
}

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const styles: Record<string, string> = {
    High: 'bg-red-500/10 text-red-400 border-red-500/30',
    Medium: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Low: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Info: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  };

  const icons: Record<string, any> = {
    High: ShieldX,
    Medium: ShieldAlert,
    Low: AlertTriangle,
    Info: Info
  };

  const Icon = icons[severity] || Info;

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-tighter ${styles[severity]}`}>
      <Icon className="h-2.5 w-2.5" />
      {severity}
    </span>
  );
};

const SecurityAudit: React.FC<SecurityAuditProps> = ({ report, isScanning, hasCompileError }) => {
  const [internalTab, setInternalTab] = useState<'automated' | 'checklist'>('automated');

  if (isScanning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 animate-pulse">
        <ShieldCheck className="h-8 w-8 text-indigo-500 opacity-50" />
        <div className="text-[10px] font-mono tracking-widest uppercase">Analyzing AST...</div>
      </div>
    );
  }

  if (hasCompileError) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500/80 text-center p-4">
        <ShieldX className="h-10 w-10 mb-2 opacity-50 text-red-500" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-white">Compilation Required</p>
        <p className="text-[10px] mt-1 opacity-70">Fix compiler errors to enable auditing.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
        <Zap className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-[10px] uppercase tracking-widest font-bold">Waiting for Compile</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/10 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Stats Column */}
        <div className="w-48 border-r border-gray-800 p-3 flex flex-col gap-4 bg-gray-900/50 shrink-0">
          <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 ${getScoreBg(report.score)} shadow-inner`}>
             <span className={`text-2xl font-black ${getScoreColor(report.score)}`}>{report.score}</span>
             <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Security Score</span>
          </div>

          <div className="space-y-1.5">
             <div className="flex items-center justify-between px-2 py-1 bg-red-500/5 border border-red-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">High</span>
                <span className="text-[10px] font-black text-red-400">{report.summary.high}</span>
             </div>
             <div className="flex items-center justify-between px-2 py-1 bg-orange-500/5 border border-orange-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">Med</span>
                <span className="text-[10px] font-black text-orange-400">{report.summary.medium}</span>
             </div>
             <div className="flex items-center justify-between px-2 py-1 bg-yellow-500/5 border border-yellow-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">Low</span>
                <span className="text-[10px] font-black text-yellow-500">{report.summary.low}</span>
             </div>
          </div>
          
          <div className="mt-auto">
             <button 
               onClick={() => setInternalTab(internalTab === 'automated' ? 'checklist' : 'automated')}
               className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
             >
               {internalTab === 'automated' ? <ClipboardCheck className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
               {internalTab === 'automated' ? 'Checklist' : 'Report'}
             </button>
          </div>
        </div>

        {/* Right Content Column */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {internalTab === 'checklist' ? (
            <SecurityChecklist isPanelMode />
          ) : (
            <div className="space-y-2 pb-4">
              {report.findings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 p-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No issues found</p>
                </div>
              ) : (
                report.findings
                  .sort((a, b) => {
                    const levels: Record<string, number> = { High: 3, Medium: 2, Low: 1, Info: 0 };
                    return levels[b.severity] - levels[a.severity];
                  })
                  .map((finding, idx) => (
                  <div key={idx} className="p-3 bg-gray-900 border border-gray-800 rounded hover:border-gray-700 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          <h4 className="text-[11px] font-bold text-gray-200 group-hover:text-indigo-400 transition-colors truncate max-w-[200px] uppercase tracking-tight">{finding.title}</h4>
                       </div>
                       <a href={`https://swcregistry.io/docs/${finding.id}`} target="_blank" rel="noreferrer" title="Registry Reference">
                          <ExternalLink className="h-3 w-3 text-gray-600 hover:text-gray-400" />
                       </a>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed mb-3 line-clamp-2 italic">{finding.description}</p>
                    <div className="pt-2 border-t border-gray-800/50">
                       <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <Zap className="h-2.5 w-2.5" /> Fix
                       </p>
                       <p className="text-[10px] text-gray-400 leading-snug">{finding.recommendation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
