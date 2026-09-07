import React, { useEffect, useState } from 'react';
import { SecurityReport } from '../utils/securityScanner';
import { ShieldCheck, ShieldAlert, ShieldX, Info, CheckCircle2, AlertTriangle, ExternalLink, Zap, ClipboardCheck, Lock, Loader2, type LucideIcon } from 'lucide-react';
import SecurityChecklist from './SecurityChecklist';
import { requestCreAudit, getCachedCreVerdict, type CreAuditResult } from '../utils/creClient';
import { isCreGateEnabled, getCreConsumerAddress, getCreWorkflowId } from '../utils/creConstants';
import { recordCreVerdictOnchain } from '../utils/creConsumer';
import { useWeb3 } from '../context/Web3Context';
import { getErrorMessage } from '../utils/errorMessage';

interface SecurityAuditProps {
  report: SecurityReport | null;
  isScanning: boolean;
  hasCompileError?: boolean;
  /** Current editor source — required for Confidential CRE audit */
  sourceCode?: string;
  sourceHash?: string;
  network?: string;
}

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const styles: Record<string, string> = {
    High: 'bg-red-500/10 text-red-400 border-red-500/30',
    Medium: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Low: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Info: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  };

  const icons: Record<string, LucideIcon> = {
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

const ConfidenceBadge: React.FC<{ confidence: string }> = ({ confidence }) => {
  const styles: Record<string, string> = {
    High: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Low: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  };

  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-tighter ${styles[confidence] || styles.Medium}`}>
      Conf: {confidence}
    </span>
  );
};

const SecurityAudit: React.FC<SecurityAuditProps> = ({
  report,
  isScanning,
  hasCompileError,
  sourceCode = '',
  sourceHash = '',
  network = 'sepolia',
}) => {
  const { signer, isConnected, connect } = useWeb3();
  const [internalTab, setInternalTab] = useState<'automated' | 'checklist' | 'confidential'>('automated');
  const [creBusy, setCreBusy] = useState(false);
  const [creError, setCreError] = useState<string | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordTx, setRecordTx] = useState<string | null>(null);
  const [creResult, setCreResult] = useState<CreAuditResult | null>(
    () => (sourceHash ? getCachedCreVerdict(sourceHash) || null : null)
  );

  useEffect(() => {
    setCreResult(sourceHash ? getCachedCreVerdict(sourceHash) || null : null);
    setCreError(null);
    setRecordTx(null);
  }, [sourceHash]);

  const runConfidential = async () => {
    if (!sourceCode || !sourceHash) {
      setCreError('Compile first so a content hash is available.');
      return;
    }
    setCreBusy(true);
    setCreError(null);
    setRecordTx(null);
    try {
      const result = await requestCreAudit({
        sourceCode,
        sourceHash,
        network,
      });
      setCreResult(result);
    } catch (e) {
      setCreError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreBusy(false);
    }
  };

  const recordOnchain = async () => {
    const consumer = getCreConsumerAddress();
    if (!creResult?.gateable || !creResult.verdict || !consumer) return;
    if (!isConnected || !signer) {
      setCreError('Connect MetaMask to record the verdict on Sepolia.');
      await connect();
      return;
    }
    setRecordBusy(true);
    setCreError(null);
    try {
      const { txHash } = await recordCreVerdictOnchain({
        signer,
        consumerAddress: consumer,
        verdictCode: creResult.verdictCode,
        riskMask: creResult.riskMask,
        sourceHash: creResult.sourceHash,
      });
      setRecordTx(txHash);
    } catch (e) {
      setCreError(
        getErrorMessage(e) ||
          'recordVerdict failed — wallet must be owner or authorizedReporter on the consumer.'
      );
    } finally {
      setRecordBusy(false);
    }
  };

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

  // score === -1 / missing report: still show Confidential (deploy gate). Empty state is Report-tab only.
  const reportReady = Boolean(report && report.score !== -1);
  const displayScore = reportReady && report ? report.score : null;
  const summary = reportReady && report ? report.summary : { high: 0, critical: 0, medium: 0, low: 0 };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-500/10 border-gray-500/30';
    if (score >= 90) return 'bg-green-500/10 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const verdictColor =
    creResult?.mode === 'accepted' || !creResult?.verdict
      ? 'text-yellow-400'
      : creResult.verdict === 'ALLOW'
        ? 'text-green-400'
        : creResult.verdict === 'DENY'
          ? 'text-red-400'
          : 'text-yellow-400';

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 border-r border-gray-800 p-3 flex flex-col gap-4 bg-gray-900/50 shrink-0">
          <div className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 ${getScoreBg(displayScore)} shadow-inner`}>
             <span className={`text-2xl font-black ${displayScore === null ? 'text-gray-500' : getScoreColor(displayScore)}`}>
               {displayScore === null ? '—' : displayScore}
             </span>
             <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Security Score</span>
          </div>

          <div className="space-y-1.5">
             <div className="flex items-center justify-between px-2 py-1 bg-red-500/5 border border-red-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">High</span>
                <span className="text-[10px] font-black text-red-400">{summary.high + summary.critical}</span>
             </div>
             <div className="flex items-center justify-between px-2 py-1 bg-orange-500/5 border border-orange-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">Med</span>
                <span className="text-[10px] font-black text-orange-400">{summary.medium}</span>
             </div>
             <div className="flex items-center justify-between px-2 py-1 bg-yellow-500/5 border border-yellow-500/10 rounded">
                <span className="text-[9px] font-bold text-gray-500 uppercase">Low</span>
                <span className="text-[10px] font-black text-yellow-500">{summary.low}</span>
             </div>
          </div>
          
          <div className="mt-auto space-y-1.5">
             <button 
               onClick={() => setInternalTab('automated')}
               className={`w-full py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                 internalTab === 'automated' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
               }`}
             >
               <ShieldCheck className="h-3 w-3" /> Report
             </button>
             <button 
               onClick={() => setInternalTab('checklist')}
               className={`w-full py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                 internalTab === 'checklist' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
               }`}
             >
               <ClipboardCheck className="h-3 w-3" /> Checklist
             </button>
             <button 
               onClick={() => setInternalTab('confidential')}
               className={`w-full py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                 internalTab === 'confidential' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
               }`}
             >
               <Lock className="h-3 w-3" /> Confidential
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {internalTab === 'checklist' ? (
            <SecurityChecklist isPanelMode />
          ) : internalTab === 'confidential' ? (
            <div className="space-y-3 pb-4">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded">
                <p className="text-[10px] font-bold text-gray-200 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-indigo-400" /> Chainlink CRE gate (staging)
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Stub mode runs Aethon&apos;s proprietary policy locally via the audit proxy (not inside a TEE yet).
                  TEE / <code className="text-gray-400">handlerInTee</code> is the target once a CRE workflow is
                  registered. Live MetaMask deploy uses a client-side gate when enabled in Settings
                  {isCreGateEnabled() ? ' (on)' : ' (off)'} — not a hard enclave firewall.
                </p>
              </div>
              <button
                type="button"
                onClick={runConfidential}
                disabled={creBusy}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {creBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                {creBusy ? 'Running audit…' : 'Run staging / CRE audit'}
              </button>
              {creError && (
                <p className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 rounded p-2">{creError}</p>
              )}
              {creResult && (
                <div className="p-3 bg-gray-900 border border-gray-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black uppercase tracking-widest ${verdictColor}`}>
                      {creResult.mode === 'accepted' || !creResult.verdict
                        ? 'ACCEPTED'
                        : creResult.verdict}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">{creResult.mode}</span>
                  </div>
                  {creResult.mode === 'accepted' && (
                    <p className="text-[10px] text-yellow-400/90 border border-yellow-500/20 bg-yellow-500/5 rounded p-2">
                      Workflow accepted — not gateable for deploy until a real verdict exists. Use Stub mode for a
                      local policy result.
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{creResult.reason}</p>
                  <p className="text-[9px] font-mono text-gray-600 break-all">
                    hash {creResult.sourceHash.slice(0, 16)}… · mask 0x{creResult.riskMask.toString(16)}
                    {creResult.gateable ? '' : ' · not gateable'}
                  </p>
                  {creResult.executionId && (
                    <p className="text-[9px] text-gray-500">
                      execution {creResult.executionId}
                      {' · '}
                      <a
                        href="https://app.chain.link/cre/workflows"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 inline-flex items-center gap-0.5"
                      >
                        CRE UI <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </p>
                  )}
                  {getCreWorkflowId() && (
                    <p className="text-[9px] text-gray-600 font-mono truncate">workflow {getCreWorkflowId()}</p>
                  )}
                  {getCreConsumerAddress() && (
                    <p className="text-[9px] text-gray-600 font-mono truncate">
                      consumer {getCreConsumerAddress()}
                    </p>
                  )}
                  {creResult.gateable && creResult.verdict && getCreConsumerAddress() && (
                    <div className="pt-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={recordOnchain}
                        disabled={recordBusy}
                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-gray-200 rounded text-[9px] font-black uppercase tracking-widest"
                      >
                        {recordBusy ? 'Recording…' : 'Record verdict on Sepolia'}
                      </button>
                      <p className="text-[8px] text-gray-600 leading-relaxed">
                        Staging only: calls consumer.recordVerdict (owner/authorizedReporter). Keystone DON write is
                        the production target.
                      </p>
                      {recordTx && (
                        <p className="text-[9px] text-green-400 font-mono break-all">tx {recordTx}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !reportReady ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center p-4">
              <Zap className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-[10px] uppercase tracking-widest font-bold">Waiting for Meaningful Code</p>
              <p className="text-[9px] mt-1 opacity-50">
                Write more logic for the automated report — Confidential audit is still available.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {!report || report.findings.length === 0 ? (
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
                          <ConfidenceBadge confidence={finding.confidence} />
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
          {internalTab === 'automated' && reportReady && (
            <p className="text-[9px] text-gray-600 px-3 pb-3 border-t border-gray-800/50 pt-2">
              Static heuristics only — staging CRE audit (Problem Audit → Confidential) is the live deploy gate.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
