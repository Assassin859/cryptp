import { COMPILER_VERSIONS, detectPragmaVersion, DEFAULT_VERSION } from './compilerVersions';
import { priceService } from './PriceService';
import { browserVM } from './browserVM';
import { getErrorMessage } from './errorMessage';

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

// Browser-native compilation using Solc-WASM in a WebWorker
const worker = typeof window !== 'undefined' ? new Worker(new URL('./compiler.worker.ts', import.meta.url), {
  type: 'module'
}) : null;

let currentWorkerVersionUrl = '';
let compileInFlight = false;

type WorkerReply = {
  requestId?: string;
  type?: string;
  success?: boolean;
  errors?: CompilationError[];
  abi?: unknown[];
  bytecode?: string;
  sourceMap?: string;
  error?: string;
};

const workerRequests = new Map<
  string,
  { resolve: (data: WorkerReply) => void; reject: (err: Error) => void; timeoutId: ReturnType<typeof setTimeout> }
>();

function postWorkerRequest(payload: Record<string, unknown>, timeoutMs: number): Promise<WorkerReply> {
  if (!worker) {
    return Promise.reject(new Error('Compiler worker is not available'));
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      workerRequests.delete(requestId);
      reject(new Error('Compiler worker request timed out'));
    }, timeoutMs);
    workerRequests.set(requestId, { resolve, reject, timeoutId });
    worker.postMessage({ ...payload, requestId });
  });
}

if (worker) {
  worker.addEventListener('message', (event: MessageEvent<WorkerReply>) => {
    const { requestId } = event.data;
    if (!requestId) return;
    const pending = workerRequests.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    workerRequests.delete(requestId);
    if (event.data.type === 'VERSION_LOAD_FAILED') {
      pending.reject(new Error(event.data.error || 'Worker request failed'));
    } else {
      pending.resolve(event.data);
    }
  });
}

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


const compilationFailed = (
  message: string,
  sourceCode: string,
  activeFileName: string = 'contract.sol'
): CompilationResult => ({
  success: false,
  errors: [{ type: 'error', message, sourceLocation: { file: activeFileName, start: 0, end: 0 } }],
  sourceCode,
  code: sourceCode,
});

const compileInWorker = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[], forcedVersion?: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  if (!worker) {
    return compilationFailed(
      'Compiler worker is not available. Refresh the page and try again.',
      sourceCode,
      activeFileName
    );
  }

  if (compileInFlight) {
    return compilationFailed(
      'A compilation is already in progress. Please wait for it to finish.',
      sourceCode,
      activeFileName
    );
  }

  compileInFlight = true;
  try {
    const detectedVersion = forcedVersion || detectPragmaVersion(sourceCode);
    const versionData = COMPILER_VERSIONS[detectedVersion || DEFAULT_VERSION];

    if (versionData && versionData.url !== currentWorkerVersionUrl) {
      console.log(`Switching compiler to version ${detectedVersion || DEFAULT_VERSION}...`);
      try {
        const loadReply = await postWorkerRequest(
          { type: 'LOAD_VERSION', versionUrl: versionData.url },
          35000
        );
        if (loadReply.type === 'VERSION_LOADED') {
          currentWorkerVersionUrl = versionData.url;
        }
      } catch (e: unknown) {
        console.error('Compiler Switch Failed:', getErrorMessage(e));
        throw e;
      }
    }

    const compileAll = sourceCode === '__COMPILE_ALL__';
    const effectiveSource = compileAll ? '' : sourceCode;

    let expandedFiles = projectFiles;
    try {
      expandedFiles = await resolveRemoteImports(effectiveSource, projectFiles, compileAll);
    } catch (err) {
      console.error('[Compiler] Remote resolution failed:', err);
    }

    const reply = await postWorkerRequest(
      {
        type: 'COMPILE',
        sourceCode: effectiveSource,
        contractName,
        projectFiles: expandedFiles,
        activeFileName,
      },
      120000
    );

    const { success, errors, abi, bytecode, sourceMap } = reply;

    if (success && bytecode) {
      const contractSize = bytecode.length / 2;
      const gasEstimate = Math.max(21000, contractSize * 200);
      return {
        success: true,
        errors,
        abi,
        bytecode: bytecode.startsWith('0x') ? bytecode : '0x' + bytecode,
        sourceMap,
        sourceCode,
        code: sourceCode,
        simulation: await generateDeploymentSimulation(gasEstimate),
        contractSize,
        gasEstimate,
      };
    }

    return {
      success: false,
      errors,
      sourceCode,
      code: sourceCode,
    };
  } finally {
    compileInFlight = false;
  }
};

const compileWithRealSolc = async (sourceCode: string, contractName: string = 'Contract', projectFiles?: { name: string, content: string }[], forcedVersion?: string, activeFileName: string = 'contract.sol'): Promise<CompilationResult> => {
  try {
    return await compileInWorker(sourceCode, contractName, projectFiles, forcedVersion, activeFileName);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Compilation failed unexpectedly.';
    return compilationFailed(message, sourceCode, activeFileName);
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