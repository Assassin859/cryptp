import React, { useState } from 'react';
import { CompileResult } from '../utils/solcCompiler';
import { AlertTriangle, CheckCircle, Copy, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface CompileOutputProps {
  result: CompileResult;
  code?: string;
}

function estimateGas(code: string): number {
  // Rough estimation based on code complexity
  let gasEstimate = 21000; // Base deployment gas
  
  // Count functions
  const functionMatches = code.match(/function\s+\w+/g) || [];
  gasEstimate += functionMatches.length * 1000;
  
  // Count state variables
  const stateVarMatches = code.match(/\s+(uint|bool|address|string|bytes)\s+\w+.*?;/g) || [];
  gasEstimate += stateVarMatches.length * 500;
  
  // Count mappings
  const mappingMatches = code.match(/mapping\s*\(/g) || [];
  gasEstimate += mappingMatches.length * 2000;
  
  // Estimate contract size impact
  const contractSize = code.length;
  gasEstimate += Math.ceil(contractSize / 100) * 100;
  
  return gasEstimate;
}

const CompileOutput: React.FC<CompileOutputProps> = ({ result }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['errors']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? 'Compiled Successfully' : 'Compilation Failed'}
          </span>
        </div>
      </div>

      {/* Output Sections */}
      <div className="flex-1 overflow-y-auto text-sm">
        {/* Errors/Warnings */}
        {result.errors && result.errors.length > 0 && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('errors')}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
            >
              <span className="font-medium">
                Issues ({result.errors.filter(e => e.type === 'error').length} errors, {result.errors.filter(e => e.type === 'warning').length} warnings)
              </span>
              {expandedSections.has('errors') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('errors') && (
              <div className="p-3 space-y-2 bg-gray-900/50">
                {result.errors.map((error, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs font-mono ${
                      error.type === 'error'
                        ? 'bg-red-900/20 text-red-300'
                        : 'bg-yellow-900/20 text-yellow-300'
                    }`}
                  >
                    <div className="font-bold">
                      {error.type === 'error' ? '❌' : '⚠️'} {error.type.toUpperCase()}
                    </div>
                    <div className="mt-1">{error.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABI */}
        {result.abi && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('abi')}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
            >
              <span className="font-medium">ABI Output</span>
              {expandedSections.has('abi') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('abi') && (
              <div className="p-3 bg-gray-900/50">
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(result.abi, null, 2))}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-gray-300 overflow-x-auto max-h-60 bg-black/30 p-2 rounded">
                  {JSON.stringify(result.abi, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Gas Estimation */}
        {result.success && result.code && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('gas')}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
            >
              <span className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Gas Estimation
              </span>
              {expandedSections.has('gas') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('gas') && (
              <div className="p-3 bg-gray-900/50 space-y-3">
                {(() => {
                  const gasEstimate = estimateGas(result.code || '');
                  const ethPrice = 2000; // Assume $2000/ETH for quick calc
                  const gasPrice = 20; // gwei
                  const estimatedCost = (gasEstimate / 1e9) * gasPrice * ethPrice;
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/30 p-2 rounded">
                          <div className="text-xs text-gray-500">Deployment Gas</div>
                          <div className="text-sm font-mono text-blue-300 mt-1">
                            ~{gasEstimate.toLocaleString()} units
                          </div>
                        </div>
                        <div className="bg-black/30 p-2 rounded">
                          <div className="text-xs text-gray-500">Est. Cost @ 20 Gwei</div>
                          <div className="text-sm font-mono text-green-300 mt-1">
                            {((gasEstimate / 1e9) * gasPrice).toFixed(4)} ETH
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 bg-black/20 p-2 rounded">
                        <p>💰 Estimated USD cost: ${estimatedCost.toFixed(2)} (at $2000/ETH)</p>
                        <p className="mt-1 text-gray-500">Note: This is an approximation. Actual gas used may vary.</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Bytecode */}
        {result.bytecode && (
          <div className="border-b border-gray-700">
            <button
              onClick={() => toggleSection('bytecode')}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 flex items-center justify-between hover:text-white transition"
            >
              <span className="font-medium">Bytecode</span>
              {expandedSections.has('bytecode') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('bytecode') && (
              <div className="p-3 bg-gray-900/50">
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => copyToClipboard(result.bytecode || '')}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Length: {(result.bytecode || '').length} chars
                </div>
                <pre className="text-xs text-gray-300 overflow-x-auto max-h-60 bg-black/30 p-2 rounded break-all">
                  {result.bytecode}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Success message */}
        {result.success && result.abi && (
          <div className="p-3 bg-blue-900/20 border-b border-gray-700">
            <p className="text-xs text-blue-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Syntax validated! Copy the code to Remix IDE for full compilation and deployment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompileOutput;
