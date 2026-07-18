import React, { useState, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { CompilationResult } from '../utils/hardhatCompiler';

import { 
  FileCode,
  Zap,
  Settings,
  ShieldCheck,
  GitCompare
} from 'lucide-react';

import { SimulatedDeployment } from '../types';
import { SecurityReport } from '../utils/securityScanner';
import { getRepoContents, fetchBlobContent } from '../utils/github';

interface SolidityEditorProps {
  code: string;
  activeFileName: string;
  compileResult: CompilationResult | null;
  isCompiling: boolean;
  onCodeChange: (code: string) => void;
  onNewDeployment?: (entry: SimulatedDeployment) => void;
  projectFiles?: { name: string; content: string }[];
  securityReport: SecurityReport | null;
  isScanning: boolean;
  onCompile?: () => void;
  githubRepo?: string | null;
  githubBranch?: string | null;
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({
  code,
  activeFileName,
  isCompiling,
  onCodeChange,
  securityReport,
  isScanning,
  onCompile,
  githubRepo = null,
  githubBranch: _githubBranch = 'main'
}) => {
  const [showStartScreen, setShowStartScreen] = useState(!code && !activeFileName);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  useEffect(() => {
    setShowStartScreen(!code && !activeFileName);
  }, [code, activeFileName]);

  useEffect(() => {
    setIsDiffMode(false);
    setOriginalCode('');
    setDiffError(null);
  }, [activeFileName]);

  const handleCompile = async () => {
    if (onCompile) onCompile();
  };

  const handleToggleDiff = async () => {
    if (isDiffMode) {
      setIsDiffMode(false);
      return;
    }

    try {
      setIsFetchingRemote(true);
      setDiffError(null);
      
      // getRepoContents and fetchBlobContent are statically imported at the top
      
      // Fetch the content of this file from the GitHub repository
      const contentData: any = await getRepoContents(githubRepo!, activeFileName);
      
      let remoteText = '';
      if (contentData && !Array.isArray(contentData)) {
        if (contentData.content) {
          const base64Clean = contentData.content.replace(/\n/g, '');
          try {
            remoteText = decodeURIComponent(escape(atob(base64Clean)));
          } catch {
            remoteText = atob(base64Clean);
          }
        } else if (contentData.git_url) {
          remoteText = await fetchBlobContent(contentData.git_url);
        }
      }
      setOriginalCode(remoteText);
      setIsDiffMode(true);
    } catch (err: any) {
      console.error(err);
      if (err.status === 404) {
        // File not found on remote (new local file)
        setOriginalCode('');
        setIsDiffMode(true);
      } else {
        setDiffError(err.message || 'Failed to fetch remote repository content.');
      }
    } finally {
      setIsFetchingRemote(false);
    }
  };

  if (showStartScreen) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
             <div className="size-16 bg-gray-900/50 border border-gray-800 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <FileCode className="size-8 text-gray-700" />
             </div>
             <h2 className="text-lg font-black text-white mb-2 uppercase tracking-widest">Workspace Ready</h2>
             <p className="text-xs text-gray-500 mb-8 leading-relaxed max-md:hidden">Select a project from the explorer or create a new contract from the sidebar utility.</p>
             
             <div className="flex flex-col gap-2 max-w-xs mx-auto max-md:hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-lg text-[10px] text-gray-500">
                   <span>New File</span>
                   <kbd className="bg-gray-800 px-1 rounded border border-gray-700">Ctrl+N</kbd>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-lg text-[10px] text-gray-500">
                   <span>Search Workspace</span>
                   <kbd className="bg-gray-800 px-1 rounded border border-gray-700">Ctrl+P</kbd>
                </div>
             </div>
             <p className="text-xs text-gray-600 font-bold uppercase tracking-wider md:hidden">
               Open CryptP on desktop to browse workspaces and create contracts.
             </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* 🛠️ Compact Editor Header */}
      <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-3 justify-between shrink-0 font-sans">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
             <FileCode className="size-3 text-blue-500" />
             {activeFileName || 'Untitled.sol'}
          </div>
          <div className="h-3 w-[1px] bg-gray-800 max-md:hidden"></div>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase italic tracking-tighter max-md:hidden">
             {isDiffMode ? 'Comparing with Remote (main)' : 'Active Implementation'}
          </div>
        </div>

        <div className="flex items-center gap-2">
           {githubRepo && (
             <button
               onClick={handleToggleDiff}
               disabled={isFetchingRemote}
               className={`flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                 isDiffMode 
                   ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/10' 
                   : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
               }`}
             >
               <GitCompare className="size-3" />
               {isFetchingRemote ? 'Fetching...' : isDiffMode ? 'Close Diff' : 'Compare'}
             </button>
           )}
           {isScanning && (
             <div className="flex items-center gap-1.5 animate-pulse mr-2">
                <div className="size-1 bg-blue-500 rounded-full" />
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Scanning...</span>
             </div>
           )}
           {!isScanning && securityReport && securityReport.score !== -1 && (
             <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border mr-2 max-md:hidden ${securityReport.score < 70 ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-green-500/5 border-green-500/20 text-green-500'}`}>
                <ShieldCheck className="size-2.5" />
                <span className="text-[8px] font-black">{securityReport.score}% Safe</span>
             </div>
           )}
           <button 
             onClick={handleCompile}
             disabled={isCompiling}
             className={`flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
               isCompiling ? 'bg-gray-800 text-gray-600 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10'
             }`}
           >
             {isCompiling ? <Settings className="size-3 animate-spin" /> : <Zap className="size-3" />}
             {isCompiling ? 'Building...' : 'Compile'}
           </button>
        </div>
      </div>

      {diffError && (
        <div className="bg-red-950/20 border-b border-red-500/10 px-3 py-1 text-[9px] text-red-400 flex items-center justify-between font-sans">
          <span>{diffError}</span>
          <button onClick={() => setDiffError(null)} className="text-[8px] uppercase font-bold hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Editor Container */}
      <div className="flex-1 overflow-hidden relative">
        {isDiffMode ? (
          <DiffEditor
            height="100%"
            original={originalCode}
            modified={code}
            language="solidity"
            theme="vs-dark"
            options={{
              originalEditable: false,
              readOnly: false,
              minimap: { enabled: false },
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 20,
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorWidth: 2,
              fontLigatures: true,
              padding: { top: 10, bottom: 10 },
              automaticLayout: true,
              wordWrap: 'on',
              smoothScrolling: true,
            }}
            onMount={(editor) => {
              const modifiedEditor = editor.getModifiedEditor();
              modifiedEditor.onDidChangeModelContent(() => {
                onCodeChange(modifiedEditor.getValue());
              });
            }}
          />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="solidity"
            value={code}
            onChange={(value) => onCodeChange(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 20,
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorWidth: 2,
              fontLigatures: true,
              padding: { top: 10, bottom: 10 },
              lineNumbers: 'on',
              automaticLayout: true,
              wordWrap: 'on',
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              contextmenu: true,
              fixedOverflowWidgets: true,
              scrollbar: {
                 vertical: 'visible',
                 horizontal: 'visible',
                 verticalScrollbarSize: 10,
                 horizontalScrollbarSize: 10
              }
            }}
            onMount={(editor) => {
              editor.onDidChangeModelContent(() => {
                onCodeChange(editor.getValue());
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SolidityEditor;
