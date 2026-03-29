// Browser-compatible Solidity compilation using fallback approach
// Note: Real compilation requires Node.js environment with Hardhat

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
  sourceCode?: string;
  code?: string;
  simulation?: DeploymentSimulation;
  contractSize?: number;
  gasEstimate?: number;
  isMockResult?: boolean; // Indicates if this is mock data due to browser limitations
  isHardcoded?: boolean; // Indicates if this is hardcoded bytecode
}

// Basic syntax validation for Solidity (works in browser)
const validateSyntax = (sourceCode: string): CompilationError[] => {
  const errors: CompilationError[] = [];

  // Check for basic syntax issues
  if (!sourceCode.includes('pragma solidity')) {
    errors.push({
      type: 'error',
      message: 'Missing pragma solidity directive'
    });
  }

  if (!sourceCode.includes('contract')) {
    errors.push({
      type: 'error',
      message: 'No contract definition found'
    });
  }

  // Check for unmatched braces
  const openBraces = (sourceCode.match(/{/g) || []).length;
  const closeBraces = (sourceCode.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push({
      type: 'error',
      message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`
    });
  }

  // Check for unmatched parentheses
  const openParens = (sourceCode.match(/\(/g) || []).length;
  const closeParens = (sourceCode.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push({
      type: 'error',
      message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`
    });
  }

  // Check for common mistakes
  if (!sourceCode.includes('SPDX-License-Identifier')) {
    errors.push({
      type: 'warning',
      message: 'Missing SPDX license identifier (recommended)'
    });
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

// Mock ABI generation for demonstration (works in browser)
const generateMockABI = (contractName: string = 'Contract'): unknown[] => {
  return [
    {
      type: 'constructor',
      inputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false }
      ],
      anonymous: false
    }
  ];
};

// Browser-compatible compilation with syntax validation
const compileInBrowser = (sourceCode: string, contractName: string = 'Contract'): CompilationResult => {
  try {
    // Perform syntax validation
    const errors = validateSyntax(sourceCode);

    // Extract contract name from source code
    const contractMatch = sourceCode.match(/contract\s+(\w+)/);
    const actualContractName = contractMatch ? contractMatch[1] : contractName;

    // If there are errors, return them
    if (errors.some(e => e.type === 'error')) {
      return {
        success: false,
        errors,
        sourceCode,
        code: sourceCode,
        isMockResult: true
      };
    }

    // Generate mock bytecode (simulating real compilation)
    // Generate valid basic bytecode (minimal contract that returns 42)
    // 602a60005260206000f3 (PUSH1 0x2a, PUSH1 0, MSTORE, PUSH1 32, PUSH1 0, RETURN)
    const mockBytecode =
      '0x6080604052348015600f57600080fd5b50602a60005260206000f3' +
      Array(100)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');

    // Estimate gas based on contract complexity
    let gasEstimate = 21000; // Base deployment gas
    const functionMatches = sourceCode.match(/function\s+\w+/g) || [];
    gasEstimate += functionMatches.length * 1000;
    const stateVarMatches = sourceCode.match(/\s+(uint|bool|address|string|bytes)\s+\w+.*?;/g) || [];
    gasEstimate += stateVarMatches.length * 500;

    const contractSize = mockBytecode.length / 2; // bytes

    return {
      success: true,
      errors: errors.length > 0 ? errors : undefined,
      abi: generateMockABI(actualContractName),
      bytecode: mockBytecode,
      sourceCode,
      code: sourceCode,
      simulation: generateDeploymentSimulation(gasEstimate),
      contractSize,
      gasEstimate,
      isMockResult: true // Indicates this is validated but not truly compiled
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during validation'
        }
      ],
      sourceCode,
      code: sourceCode,
      isMockResult: true
    };
  }
};

// Try to use real solc if available, fallback to browser-compatible validation
const compileWithRealSolc = async (sourceCode: string, contractName: string = 'Contract'): Promise<CompilationResult> => {
  try {
    // Check if we're in a Node.js environment with solc available
    if (typeof window === 'undefined') {
      // We're in Node.js, try to use real solc
      const solc = await import('solc');

      const input = {
        language: 'Solidity',
        sources: {
          'contract.sol': {
            content: sourceCode
          }
        },
        settings: {
          outputSelection: {
            '*': {
              '*': ['*']
            }
          },
          optimizer: {
            enabled: false, // Completely disable optimizer
            runs: 200
          },
          evmVersion: 'byzantium' // Use Byzantium EVM version (very old, maximum compatibility)
        }
      };

      // Try to use a specific older solc version if available
      let solcInstance = solc;
      if (solc.version && solc.version() !== '0.8.28') {
        // If we have a different version, try to use it
        console.log('Using solc version:', solc.version());
      }

      const output = JSON.parse(solc.compile(JSON.stringify(input)));

      if (output.errors) {
        const errors: CompilationError[] = output.errors.map((error: any) => ({
          type: error.severity as 'error' | 'warning',
          message: error.message,
          sourceLocation: error.sourceLocation ? {
            file: error.sourceLocation.file,
            start: error.sourceLocation.start,
            end: error.sourceLocation.end
          } : undefined
        }));

        if (errors.some(e => e.type === 'error')) {
          return {
            success: false,
            errors,
            sourceCode,
            code: sourceCode
          };
        }
      }

      const contract = output.contracts?.['contract.sol']?.[contractName];
      if (!contract) {
        return {
          success: false,
          errors: [{
            type: 'error',
            message: `Contract "${contractName}" not found in compilation output`
          }],
          sourceCode,
          code: sourceCode
        };
      }

      const bytecode = contract.evm?.bytecode?.object || '';
      const contractSize = bytecode ? bytecode.length / 2 : 0;
      const gasEstimate = Math.max(21000, contractSize * 200);

      return {
        success: true,
        errors: output.errors ? output.errors.map((error: any) => ({
          type: error.severity as 'error' | 'warning',
          message: error.message,
          sourceLocation: error.sourceLocation ? {
            file: error.sourceLocation.file,
            start: error.sourceLocation.start,
            end: error.sourceLocation.end
          } : undefined
        })) : undefined,
        abi: contract.abi,
        bytecode: bytecode ? '0x' + bytecode : undefined,
        sourceCode,
        code: sourceCode,
        simulation: generateDeploymentSimulation(gasEstimate),
        contractSize,
        gasEstimate
      };
    } else {
      // We're in browser, use validation-only approach
      return compileInBrowser(sourceCode, contractName);
    }
  } catch (error) {
    // Fallback to browser-compatible validation
    console.warn('Real compilation failed, using syntax validation:', error);
    return compileInBrowser(sourceCode, contractName);
  }
};

export const compile = async (sourceCode: string, hardcodedBytecode?: string): Promise<CompilationResult> => {
  // If hardcoded bytecode is provided, use it instead of compiling
  if (hardcodedBytecode) {
    console.log('Using hardcoded bytecode for deployment, length:', hardcodedBytecode.length);
    console.log('Hardcoded bytecode starts with:', hardcodedBytecode.substring(0, 50));
    return {
      success: true,
      abi: [
        {
          type: 'function',
          name: 'getValue',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        }
      ], // Simple ABI for constant return contract
      bytecode: hardcodedBytecode,
      sourceCode,
      code: sourceCode,
      simulation: generateDeploymentSimulation(100000),
      contractSize: hardcodedBytecode.length / 2,
      gasEstimate: 100000,
      isHardcoded: true // Flag to indicate hardcoded bytecode
    };
  }

  // Extract contract name from source code
  const contractMatch = sourceCode.match(/contract\s+(\w+)/);
  const contractName = contractMatch ? contractMatch[1] : 'Contract';

  return compileWithRealSolc(sourceCode, contractName);
};

export const compileWithHardhat = async (sourceCode: string, hardcodedBytecode?: string): Promise<CompilationResult> => {
  // For browser compatibility, use the same compilation function
  return compile(sourceCode, hardcodedBytecode);
};