import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { compileWithHardhat, CompileResult } from '../utils/hardhatCompiler';
import CompileOutput from './CompileOutput';
import { ChevronRight, Copy } from 'lucide-react';
import { allTemplates } from '../utils/contractTemplates';
import { SimulatedDeployment } from '../types';

interface SolidityEditorProps {
  code: string;
  selectedTemplate: string;
  compileResult: CompileResult | null;
  isCompiling: boolean;
  onCodeChange: (code: string) => void;
  onTemplateChange: (templateId: string) => void;
  onCompileResultChange: (result: CompileResult | null) => void;
  onCompilingChange: (compiling: boolean) => void;
  onNewDeployment?: (entry: SimulatedDeployment) => void;
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({
  code,
  selectedTemplate,
  compileResult,
  isCompiling,
  onCodeChange,
  onTemplateChange,
  onCompileResultChange,
  onCompilingChange,
  onNewDeployment
}) => {
  console.log('SolidityEditor render:', { code: code?.slice(0, 50), selectedTemplate, compileResult: !!compileResult });
  const [panelRatio, setPanelRatio] = useState<number>(70); // Default 70% for editor, 30% for output
  const [isResizing, setIsResizing] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      onCodeChange(template.code);
      onTemplateChange(templateId);
      onCompileResultChange(null);
    }
  };

  const handleCompile = async () => {
    onCompilingChange(true);
    try {
      const template = allTemplates.find(t => t.id === selectedTemplate);
      const hardcodedBytecode = template?.hardcodedBytecode;
      const result = await compileWithHardhat(code, hardcodedBytecode);
      onCompileResultChange(result);
    } catch (error) {
      console.error('Compilation error:', error);
      onCompileResultChange({
        success: false,
        errors: [
          {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown compilation error'
          }
        ]
      });
    } finally {
      onCompilingChange(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  // Resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!compileResult?.success) return;
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = (x / rect.width) * 100;
    
    // Constrain ratio between 30% and 80%
    const constrainedRatio = Math.max(30, Math.min(80, ratio));
    setPanelRatio(constrainedRatio);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <ChevronRight className="h-5 w-5 mr-2 text-blue-400" />
            Solidity Code Editor
          </h2>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition"
            >
              {isCompiling ? 'Compiling...' : 'Compile'}
            </button>
          </div>
        </div>

        {/* Template Selector */}
        <div className="flex gap-2 flex-wrap">
          {allTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={`px-3 py-1 text-sm rounded transition ${
                selectedTemplate === template.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 flex overflow-hidden p-4" onMouseMove={isResizing ? handleMouseMove : undefined}>
        {/* Code Editor */}
        <div 
          className="min-w-0 border border-gray-700 rounded-lg overflow-hidden bg-gray-950"
          style={{ width: compileResult?.success ? `${panelRatio}%` : '100%' }}
        >
          <Editor
            height="100%"
            defaultLanguage="solidity"
            value={code}
            onChange={(value) => onCodeChange(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'Fira Code, monospace',
              padding: { top: 16, bottom: 16 },
              lineNumbers: 'on',
              automaticLayout: true,
              wordWrap: 'on'
            }}
          />
        </div>

        {/* Resize Handle - only show after successful compilation */}
        {compileResult?.success && (
          <div
            className="w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group relative"
            onMouseDown={handleMouseDown}
          >
            <div className="w-0.5 h-8 bg-gray-400 group-hover:bg-blue-300 rounded"></div>
          </div>
        )}

        {/* Compile Output */}
        {compileResult && (
          <div 
            className="min-w-0 border border-gray-700 rounded-lg overflow-hidden bg-gray-950 flex flex-col"
            style={{ width: compileResult?.success ? `${100 - panelRatio}%` : '20rem' }}
          >
            <CompileOutput result={compileResult} code={code} onDeployment={onNewDeployment} />
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-sm text-gray-400">
        {compileResult?.success ? (
          <p>✏️ Compilation successful! Drag the divider between panels to adjust the layout ratio.</p>
        ) : (
          <p>✏️ Select a contract template or edit the code, then click <strong>Compile</strong> to validate syntax</p>
        )}
      </div>
    </div>
  );
};

export default SolidityEditor;
