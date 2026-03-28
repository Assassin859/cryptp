import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { compile, CompileResult } from '../utils/solcCompiler';
import CompileOutput from './CompileOutput';
import { ChevronRight, Copy } from 'lucide-react';
import { allTemplates } from '../utils/contractTemplates';

interface SolidityEditorProps {
  initialCode?: string;
}

const SolidityEditor: React.FC<SolidityEditorProps> = ({ 
  initialCode = allTemplates[0].code
}) => {
  const [code, setCode] = useState<string>(initialCode);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setCode(template.code);
      setSelectedTemplate(templateId);
      setCompileResult(null);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const result = await compile(code);
      setCompileResult(result);
    } catch (error) {
      console.error('Compilation error:', error);
      setCompileResult({
        success: false,
        errors: [
          {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown compilation error'
          }
        ]
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

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
      <div className="flex-1 flex gap-4 overflow-hidden p-4">
        {/* Code Editor */}
        <div className="flex-1 min-w-0 border border-gray-700 rounded-lg overflow-hidden bg-gray-950">
          <Editor
            height="100%"
            defaultLanguage="solidity"
            value={code}
            onChange={(value) => setCode(value || '')}
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

        {/* Compile Output */}
        {compileResult && (
          <div className="w-80 border border-gray-700 rounded-lg overflow-hidden bg-gray-950 flex flex-col">
            <CompileOutput result={compileResult} code={code} />
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-sm text-gray-400">
        <p>✏️ Select a contract template or edit the code, then click <strong>Compile</strong> to validate syntax</p>
      </div>
    </div>
  );
};

export default SolidityEditor;
