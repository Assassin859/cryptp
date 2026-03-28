export interface CompileError {
  type: 'error' | 'warning';
  message: string;
}

export interface CompileResult {
  success: boolean;
  errors?: CompileError[];
  abi?: unknown[];
  bytecode?: string;
  sourceCode?: string;
  code?: string;
}

// Basic syntax validation for Solidity
const validateSyntax = (sourceCode: string): CompileError[] => {
  const errors: CompileError[] = [];

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

// Mock ABI generation for demonstration
const generateMockABI = (): unknown[] => {
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
      stateMutability: 'nonpayable',
      constant: false,
      payable: false
    },
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      constant: false,
      payable: false
    },
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      constant: true,
      payable: false
    }
  ];
};

export const compile = async (sourceCode: string): Promise<CompileResult> => {
  try {
    // Validate syntax
    const errors = validateSyntax(sourceCode);

    // If there are errors, return them
    if (errors.some(e => e.type === 'error')) {
      return {
        success: false,
        errors,
        sourceCode,
        code: sourceCode
      };
    }

    // Generate mock bytecode
    const mockBytecode =
      '0x' +
      Array(256)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');

    return {
      success: true,
      errors: errors.length > 0 ? errors : undefined,
      abi: generateMockABI(),
      bytecode: mockBytecode,
      sourceCode,
      code: sourceCode
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during validation'
        }
      ]
    };
  }
};
