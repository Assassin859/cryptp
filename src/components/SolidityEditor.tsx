import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { CompilationResult } from '../utils/hardhatCompiler';

import { 
  FileCode,
  Zap,
  Settings,
  ShieldCheck
} from 'lucide-react';

import { SimulatedDeployment } from '../types';
import { SecurityReport } from '../utils/securityScanner';

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
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({
  code,
  activeFileName,
  isCompiling,
  onCodeChange,
  securityReport,
  isScanning,
  onCompile
}) => {
  const [showStartScreen, setShowStartScreen] = useState(!code && !activeFileName);

  useEffect(() => {
    setShowStartScreen(!code && !activeFileName);
  }, [code, activeFileName]);

  const handleCompile = async () => {
    if (onCompile) onCompile();
  };

  if (showStartScreen) {
    return (
      <div className="h-full bg-gray-950 flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-2 duration-1000">
             <div className="size-16 bg-gray-900/50 border border-gray-800 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <FileCode className="size-8 text-gray-700" />
             </div>
             <h2 className="text-lg font-black text-white mb-2 uppercase tracking-widest">Workspace Ready</h2>
             <p className="text-xs text-gray-500 mb-8 leading-relaxed">Select a project from the explorer or create a new contract from the sidebar utility.</p>
             
             <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-lg text-[10px] text-gray-500">
                   <span>New File</span>
                   <kbd className="bg-gray-800 px-1 rounded border border-gray-700">Ctrl+N</kbd>
                </div>
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-lg text-[10px] text-gray-500">
                   <span>Search Workspace</span>
                   <kbd className="bg-gray-800 px-1 rounded border border-gray-700">Ctrl+P</kbd>
                </div>
             </div>
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
          <div className="h-3 w-[1px] bg-gray-800"></div>
          <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase italic tracking-tighter">
             Active Implementation
          </div>
        </div>

        <div className="flex items-center gap-2">
           {isScanning && (
             <div className="flex items-center gap-1.5 animate-pulse mr-2">
                <div className="size-1 bg-blue-500 rounded-full" />
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Scanning...</span>
             </div>
           )}
           {!isScanning && securityReport && (
             <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border mr-2 ${securityReport.score < 70 ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-green-500/5 border-green-500/20 text-green-500'}`}>
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
             {isCompiling ? 'Building...' : 'Compile & Refresh'}
           </button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-hidden relative">
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
        />
      </div>
    </div>
  );
};

export default SolidityEditor;
