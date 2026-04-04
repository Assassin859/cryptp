// Browser-compatible Solidity compilation using fallback approach
// Note: Real compilation requires Node.js environment with Hardhat
import * as parser from '@solidity-parser/parser';

export interface CompilationError {
  type: 'error' | 'warning';
  message: string;
  sourceLocation?: {
    file: string;
    start: number;
    end: number;
  };
}

export interface DeploymentSimulation {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  contractAddress: string;
  gasUsed: number;
  gasPriceGwei: number;
  effectiveGasPriceGwei: number;
  transactionCostEth: string;
  status: 'success' | 'failed';
  timestamp: string;
}

export interface CompilationResult {
  success: boolean;
  errors?: CompilationError[];
  abi?: unknown[];
  bytecode?: string;
  sourceMap?: string;
  sourceCode?: string;
  code?: string;
  simulation?: DeploymentSimulation;
  contractSize?: number;
  gasEstimate?: number;
  isMockResult?: boolean; // Indicates if this is mock data due to browser limitations
  isHardcoded?: boolean; // Indicates if this is hardcoded bytecode
}

// Strict syntax validation for Solidity using the AST parser
const validateSyntax = (sourceCode: string): CompilationError[] => {
  const errors: CompilationError[] = [];

  try {
    const ast = parser.parse(sourceCode);
    
    // Check if there is at least one contract-like definition
    let hasContract = false;
    parser.visit(ast, {
      ContractDefinition: () => { hasContract = true; }
    });

    if (!hasContract) {
      errors.push({
        type: 'error',
        message: 'No contract, interface, or library definition found in the source code.'
      });
    }
  } catch (err: any) {
    if (err.errors) {
       err.errors.forEach((e: any) => {
          errors.push({
            type: 'error',
            message: e.message,
            sourceLocation: e.loc ? {
               file: 'contract.sol',
               start: e.loc.start.line,
               end: e.loc.end.line
            } : undefined
          });
       });
    } else {
       errors.push({
         type: 'error',
         message: err.message || 'Syntax error in Solidity source'
       });
    }
  }

  // Fallback checks for common non-critical missing items
  if (!sourceCode.includes('pragma solidity') && errors.length === 0) {
    errors.push({ type: 'warning', message: 'Missing pragma solidity directive' });
  }

  if (!sourceCode.includes('SPDX-License-Identifier')) {
    errors.push({ type: 'warning', message: 'Missing SPDX license identifier (recommended)' });
  }

  return errors;
};

// Utility to create a pseudo-random hex string of given length
const randomHex = (length: number): string => {
  return '0x' +
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

const generateDeploymentSimulation = (gasEstimate: number = 1000000): DeploymentSimulation => {
  const gasUsed = gasEstimate;
  const gasPriceGwei = 20 + Math.floor(Math.random() * 30);
  const effectiveGasPriceGwei = gasPriceGwei + Math.floor(Math.random() * 5);
  const transactionCostEth = ((gasUsed / 1e9) * effectiveGasPriceGwei).toFixed(6);

  return {
    txHash: randomHex(64),
    blockNumber: 18000000 + Math.floor(Math.random() * 2000000),
    blockHash: randomHex(64),
    contractAddress: randomHex(40),
    gasUsed,
    gasPriceGwei,
    effectiveGasPriceGwei,
    transactionCostEth,
    status: 'success',
    timestamp: new Date().toISOString()
  };
};

// Original Dynamic Mock ABI generation for browser-only mode (used as safety fallback)
const generateMockABI = (sourceCode: string): unknown[] => {
  const abi: any[] = [];
  try {
    const ast = parser.parse(sourceCode);
    parser.visit(ast, {
      FunctionDefinition: (node) => {
        if (node.isConstructor) {
          abi.push({
            type: 'constructor',
            inputs: node.parameters.map(p => ({
               name: p.name || '', 
               type: (p.typeName as any)?.name || 'uint256' 
            })),
            stateMutability: node.stateMutability || 'nonpayable'
          });
        } else if (node.name) {
          abi.push({
            type: 'function',
            name: node.name,
            inputs: node.parameters.map(p => ({
               name: p.name || '', 
               type: (p.typeName as any)?.name || 'uint256'
            })),
            outputs: node.returnParameters ? node.returnParameters.map(p => ({
               name: p.name || '',
               type: (p.typeName as any)?.name || 'uint256'
            })) : [],
            stateMutability: node.stateMutability || 'nonpayable'
          });
        }
      },
      EventDefinition: (node) => {
        abi.push({
          type: 'event',
          name: node.name,
          inputs: node.parameters.map(p => ({
            name: p.name || '',
            type: (p.typeName as any)?.name || 'uint256',
            indexed: !!p.isIndexed
          })),
          anonymous: false
        });
      }
    });
  } catch (e) {
    return [{ type: 'function', name: 'error', inputs: [], outputs: [{type: 'string'}], stateMutability: 'view' }];
  }
  return abi;
};

// Browser-native compilation using Solc-WASM in a WebWorker
const worker = typeof window !== 'undefined' ? new Worker(new URL('./compiler.worker.ts', import.meta.url), {
  type: 'module'
}) : null;

const compileInWorker = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[]): Promise<CompilationResult> => {
  if (!worker) return compileInBrowser(sourceCode);

  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      const { success, errors, abi, bytecode, sourceMap } = event.data;
      worker.removeEventListener('message', handler);
      
      if (success) {
        const contractSize = bytecode ? bytecode.length / 2 : 0;
        const gasEstimate = Math.max(21000, contractSize * 200);
        
        resolve({
          success: true,
          errors: errors,
          abi,
          bytecode: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode,
          sourceMap,
          sourceCode,
          code: sourceCode,
          simulation: generateDeploymentSimulation(gasEstimate),
          contractSize,
          gasEstimate
        });
      } else {
        resolve({
          success: false,
          errors,
          sourceCode,
          code: sourceCode
        });
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ sourceCode, contractName, projectFiles });
  });
};

const compileInBrowser = (sourceCode: string): CompilationResult => {
  const errors = validateSyntax(sourceCode);
  if (errors.some(e => e.type === 'error')) {
    return { success: false, errors, sourceCode, code: sourceCode, isMockResult: true };
  }

  const mockBytecode = '0x6080604052348015600f57600080fd5b50602a60005260206000f3' + randomHex(100);
  const contractSize = mockBytecode.length / 2;
  const gasEstimate = 100000;

  return {
    success: true,
    abi: generateMockABI(sourceCode),
    bytecode: mockBytecode,
    sourceCode,
    code: sourceCode,
    simulation: generateDeploymentSimulation(gasEstimate),
    contractSize,
    gasEstimate,
    isMockResult: true
  };
};

const compileWithRealSolc = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[]): Promise<CompilationResult> => {
  try {
    if (typeof window !== 'undefined') {
       return await compileInWorker(sourceCode, contractName, projectFiles);
    }

    // Node.js environment
    const solc = await import('solc');
    let sources: any = { 'contract.sol': { content: sourceCode } };
    if (projectFiles) {
      projectFiles.forEach(f => { sources[f.name] = { content: f.content }; });
    }

    const input = {
      language: 'Solidity',
      sources: sources,
      settings: {
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode.sourceMap'] } },
        optimizer: { enabled: true, runs: 200 }
      }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const errors = output.errors.map((error: any) => ({
        type: error.severity,
        message: error.message,
        sourceLocation: error.sourceLocation
      }));

      if (errors.some((e: any) => e.type === 'error')) {
        return { success: false, errors, sourceCode, code: sourceCode };
      }
    }

    const contract = output.contracts['contract.sol']?.[contractName] || Object.values(output.contracts['contract.sol'] || {})[0];
    const bytecode = (contract as any).evm.bytecode.object;

    return {
      success: true,
      abi: (contract as any).abi,
      bytecode: '0x' + bytecode,
      sourceMap: (contract as any).evm.deployedBytecode.sourceMap,
      simulation: generateDeploymentSimulation(bytecode.length / 2 * 200),
      contractSize: bytecode.length / 2,
      gasEstimate: bytecode.length / 2 * 200
    };
  } catch (error) {
    return compileInBrowser(sourceCode);
  }
};

export const compile = async (sourceCode: string, hardcodedBytecode?: string, projectFiles?: { name: string, content: string }[]): Promise<CompilationResult> => {
  if (hardcodedBytecode) {
    return {
      success: true,
      abi: [{ type: 'function', name: 'getValue', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      bytecode: hardcodedBytecode,
      sourceCode,
      code: sourceCode,
      simulation: generateDeploymentSimulation(100000),
      contractSize: hardcodedBytecode.length / 2,
      gasEstimate: 100000,
      isHardcoded: true
    };
  }

  const contractMatch = sourceCode.match(/(?:^|\s)contract\s+([a-zA-Z0-9_]+)\s*(?:is\s+[^{]+)?\{/);
  const contractName = contractMatch ? contractMatch[1] : 'Contract';
  return compileWithRealSolc(sourceCode, contractName, projectFiles);
};

export const compileWithHardhat = async (sourceCode: string, hardcodedBytecode?: string, projectFiles?: { name: string, content: string }[]): Promise<CompilationResult> => {
  return compile(sourceCode, hardcodedBytecode, projectFiles);
};