import * as parser from '@solidity-parser/parser';
import { COMPILER_VERSIONS, detectPragmaVersion, DEFAULT_VERSION } from './compilerVersions';
import { priceService } from './PriceService';
import { browserVM } from './browserVM';

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
const validateSyntax = (sourceCode: string, fileName: string = 'contract.sol'): CompilationError[] => {
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
               file: fileName,
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

const generateDeploymentSimulation = async (gasEstimate: number = 1000000): Promise<DeploymentSimulation> => {
  const gasUsed = gasEstimate;
  const gasPriceGwei = await priceService.getGasPrice();
  const effectiveGasPriceGwei = gasPriceGwei + 2; // Simple priority fee simulation
  const transactionCostEth = ((gasUsed / 1e9) * effectiveGasPriceGwei).toFixed(6);
  const currentBlock = await browserVM.getBlockNumber();

  return {
    txHash: randomHex(64),
    blockNumber: currentBlock,
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

let currentWorkerVersionUrl = '';

/**
 * Resolves remote imports (e.g. @openzeppelin) by fetching them from a CDN.
 * Scans recursively and uses a regex fallback if AST parsing fails to ensure robustness.
 */
/**
 * Normalizes a relative path given its parent.
 */
function resolveRelativePath(parentPath: string, importPath: string): string {
  const parts = parentPath.split('/');
  parts.pop(); 
  const importParts = importPath.split('/');
  for (const part of importParts) {
    if (part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

const extractImports = (source: string): string[] => {
  // Regex fallback if parsing fails (robust against partial/broken code)
  const regex = /import\s+(?:(?:\{[^{}]*\}|(?:\*\s+as\s+[a-zA-Z_$][a-zA-Z0-9_$]*)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+)?(?:"([^"]*)"|'([^']*)')\s*;?/g;
  const imports: string[] = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const path = match[1] || match[2];
    if (path) imports.push(path);
  }
  return imports;
};

/**
 * Resolves remote imports (e.g. @openzeppelin) by fetching them from a CDN.
 * Scans recursively and uses a regex fallback if AST parsing fails to ensure robustness.
 */
async function resolveRemoteImports(
  sourceCode: string,
  existingFiles: { name: string; content: string }[] = [],
  compileAll: boolean = false
): Promise<{ name: string; content: string }[]> {
  const resolvedFiles = new Map<string, string>();
  const workspaceFiles = new Map<string, string>();
  existingFiles.forEach(f => workspaceFiles.set(f.name, f.content));
  
  const seenUrls = new Set<string>();

  const fetchWithRecursion = async (importPath: string, parentPath?: string) => {
    let url: string | null = null;
    let finalKey: string | null = null;

    if (importPath.startsWith('@openzeppelin/')) {
      const cleanPath = importPath.replace('@openzeppelin/contracts/', '');
      url = `https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.0/${cleanPath}`;
      finalKey = importPath;
    } else if (importPath.startsWith('erc721a/')) {
      const cleanPath = importPath.replace('erc721a/', '');
      url = `https://cdn.jsdelivr.net/npm/erc721a@4.3.0/${cleanPath}`;
      finalKey = importPath;
    } else if (importPath.startsWith('@oasis-protocol/sapphire-contracts/')) {
      const cleanPath = importPath.replace('@oasis-protocol/sapphire-contracts/', '');
      url = `https://cdn.jsdelivr.net/npm/@oasis-protocol/sapphire-contracts@1.1.0/${cleanPath}`;
      finalKey = importPath;
    } else if (parentPath && (importPath.startsWith('./') || importPath.startsWith('../'))) {
      finalKey = resolveRelativePath(parentPath, importPath);

      if (parentPath.startsWith('@openzeppelin/')) {
        const cleanPath = finalKey.replace('@openzeppelin/contracts/', '');
        url = `https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.0/${cleanPath}`;
      } else if (parentPath.startsWith('@oasis-protocol/sapphire-contracts/')) {
        const cleanPath = finalKey.replace('@oasis-protocol/sapphire-contracts/', '');
        url = `https://cdn.jsdelivr.net/npm/@oasis-protocol/sapphire-contracts@1.1.0/${cleanPath}`;
      } else if (workspaceFiles.has(finalKey)) {
        // Local dependency resolution
        if (resolvedFiles.has(finalKey)) return;
        const content = workspaceFiles.get(finalKey)!;
        resolvedFiles.set(finalKey, content);
        const nested = extractImports(content);
        for (const ni of nested) await fetchWithRecursion(ni, finalKey);
        return;
      } else {
        return; 
      }
    } else if (workspaceFiles.has(importPath)) {
        // Flat local import
        if (resolvedFiles.has(importPath)) return;
        const content = workspaceFiles.get(importPath)!;
        resolvedFiles.set(importPath, content);
        const nested = extractImports(content);
        for (const ni of nested) await fetchWithRecursion(ni, importPath);
        return;
    } else {
      return; 
    }

    if (!finalKey || !url || resolvedFiles.has(finalKey) || seenUrls.has(url)) return;
    seenUrls.add(url);

    try {
      const resp = await fetch(url);
      if (!resp.ok) return;
      const content = await resp.text();
      resolvedFiles.set(finalKey, content);

      const nestedImports = extractImports(content);
      for (const ni of nestedImports) {
        await fetchWithRecursion(ni, finalKey);
      }
    } catch (e) {
      console.error(`[Resolver] Failed to fetch dependency from ${url}:`, e);
    }
  };

  if (compileAll) {
    // If compiling all, recursive scan EVERY file in the workspace
    for (const [name, content] of workspaceFiles) {
      if (!resolvedFiles.has(name)) {
        resolvedFiles.set(name, content);
        const nested = extractImports(content);
        for (const ni of nested) await fetchWithRecursion(ni, name);
      }
    }
  } else {
    // Standard: Recursive scan ONLY from the active sourceCode
    const mainImports = extractImports(sourceCode);
    for (const imp of mainImports) {
      await fetchWithRecursion(imp);
    }
  }

  return Array.from(resolvedFiles.entries()).map(([name, content]) => ({ name, content }));
}


const compileInWorker = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[], forcedVersion?: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  if (!worker) return compileInBrowser(sourceCode, activeFileName);

  // 1. Version Management
  const detectedVersion = forcedVersion || detectPragmaVersion(sourceCode);
  const versionData = COMPILER_VERSIONS[detectedVersion || DEFAULT_VERSION];
  
  if (versionData && versionData.url !== currentWorkerVersionUrl) {
    console.log(`Switching compiler to version ${detectedVersion || DEFAULT_VERSION}...`);
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          worker.removeEventListener('message', loadHandler);
          reject(new Error(`Timed out switching to compiler version ${detectedVersion || DEFAULT_VERSION} (35s)`));
        }, 35000); // 35s UI safety timeout

        const loadHandler = (e: MessageEvent) => {
          if (e.data.type === 'VERSION_LOADED') {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', loadHandler);
            currentWorkerVersionUrl = versionData.url;
            resolve();
          } else if (e.data.type === 'VERSION_LOAD_FAILED') {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', loadHandler);
            reject(new Error(e.data.error || 'Unknown version load error'));
          }
        };
        worker.addEventListener('message', loadHandler);
        worker.postMessage({ type: 'LOAD_VERSION', versionUrl: versionData.url });
      });
    } catch (e: any) {
      console.error('Compiler Switch Failed:', e.message);
      // Fallback: If we had a previous version, we might want to stick with it or fail.
      // For now, we throw so the caller knows compilation cannot proceed.
      throw e;
    }
  }

  // 2. Compilation
  return new Promise((resolve) => {
    const handler = async (event: MessageEvent) => {
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
          simulation: await generateDeploymentSimulation(gasEstimate),
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
    
    // Determine if we are compiling everything or just selective dependencies
    const compileAll = (sourceCode === '__COMPILE_ALL__');
    const effectiveSource = compileAll ? '' : sourceCode;
    
    resolveRemoteImports(effectiveSource, projectFiles, compileAll).then(expandedFiles => {
      worker.postMessage({ sourceCode: effectiveSource, contractName, projectFiles: expandedFiles, activeFileName });
    }).catch(err => {
      console.error('[Compiler] Remote resolution failed:', err);
      worker.postMessage({ sourceCode: effectiveSource, contractName, projectFiles, activeFileName });
    });

  });
};

const compileInBrowser = async (sourceCode: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  const errors = validateSyntax(sourceCode, activeFileName);
  if (errors.some(e => e.type === 'error')) {
    return { success: false, errors, sourceCode, code: sourceCode, isMockResult: true };
  }

  const mockBytecode = '0x6080604052348015600f57600080fd5b50602a60005260206000f3' + randomHex(100).substring(2);
  const contractSize = mockBytecode.length / 2;
  const gasEstimate = 100000;

  return {
    success: true,
    abi: generateMockABI(sourceCode),
    bytecode: mockBytecode,
    sourceCode,
    code: sourceCode,
    simulation: await generateDeploymentSimulation(gasEstimate),
    contractSize,
    gasEstimate,
    isMockResult: true
  };
};

const compileWithRealSolc = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[], forcedVersion?: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  try {
    return await compileInWorker(sourceCode, contractName, projectFiles, forcedVersion, activeFileName);
  } catch (error) {
    return await compileInBrowser(sourceCode, activeFileName);
  }
};

export const compile = async (
  sourceCode: string, 
  hardcodedBytecode?: string, 
  projectFiles?: { name: string, content: string }[], 
  forcedVersion?: string,
  targetContractName?: string,
  activeFileName: string = 'contract.sol'
): Promise<CompilationResult> => {
  if (hardcodedBytecode) {
    return {
      success: true,
      abi: [{ type: 'function', name: 'getValue', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      bytecode: hardcodedBytecode,
      sourceCode,
      code: sourceCode,
      simulation: await generateDeploymentSimulation(100000),
      contractSize: hardcodedBytecode.length / 2,
      gasEstimate: 100000,
      isHardcoded: true
    };
  }

  // Automatic contract name detection if not provided
  const contractName = targetContractName || (() => {
    const contractMatch = sourceCode.match(/(?:^|\s)contract\s+([a-zA-Z0-9_]+)\s*(?:is\s+[^{]+)?\{/);
    return contractMatch ? contractMatch[1] : 'Contract';
  })();
  
  return compileWithRealSolc(sourceCode, contractName, projectFiles, forcedVersion, activeFileName);
};

export const compileWithHardhat = async (sourceCode: string, hardcodedBytecode?: string, projectFiles?: { name: string, content: string }[], forcedVersion?: string, targetContractName?: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  return compile(sourceCode, hardcodedBytecode, projectFiles, forcedVersion, targetContractName, activeFileName);
};