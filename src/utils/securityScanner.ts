import * as parser from '@solidity-parser/parser';

export type Severity = 'High' | 'Medium' | 'Low' | 'Info';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  recommendation: string;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface SecurityReport {
  score: number;
  findings: SecurityFinding[];
  summary: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

const RULES = {
  REENTRANCY: {
    id: 'S001',
    title: 'Potential Reentrancy',
    description: 'State variables are modified after an external call. This is a common pattern for reentrancy attacks.',
    severity: 'High' as Severity,
    recommendation: 'Use the "Checks-Effects-Interactions" pattern or a reentrancy guard (e.g., OpenZeppelin\'s ReentrancyGuard).'
  },
  TX_ORIGIN: {
    id: 'S002',
    title: 'Use of tx.origin',
    description: 'tx.origin is used for authentication. This can lead to phishing attacks where an intermediate contract can impersonate the user.',
    severity: 'Medium' as Severity,
    recommendation: 'Use msg.sender instead of tx.origin for authentication.'
  },
  INSECURE_RANDOMNESS: {
    id: 'S003',
    title: 'Insecure Randomness',
    description: 'block.timestamp or blockhash is used for randomness. These values can be manipulated by miners/validators.',
    severity: 'Medium' as Severity,
    recommendation: 'Use an oracle like Chainlink VRF for secure, verifiable randomness.'
  },
  FLOATING_PRAGMA: {
    id: 'S004',
    title: 'Floating Pragma',
    description: 'The contract uses a floating pragma (e.g., ^0.8.0). This can result in compilation with different compiler versions which may have different bugs.',
    severity: 'Low' as Severity,
    recommendation: 'Lock the pragma to a specific version (e.g., 0.8.20).'
  },
  SELFDESTRUCT: {
    id: 'S005',
    title: 'Use of selfdestruct',
    description: 'selfdestruct allows a contract to be deleted, which can be dangerous if the logic is not carefully controlled.',
    severity: 'Medium' as Severity,
    recommendation: 'Consider if contract deletion is truly necessary. Note that selfdestruct is deprecated in recent EIPs.'
  },
  UNBOUNDED_LOOP: {
    id: 'S006',
    title: 'Potential Unbounded Loop',
    description: 'Loops over dynamic arrays can exceed the gas limit if the array grows too large.',
    severity: 'Medium' as Severity,
    recommendation: 'Avoid loops over dynamic arrays or implement pagination/limit logic.'
  },
  TIMESTAMP_DEPENDENCE: {
    id: 'S007',
    title: 'Timestamp Dependence',
    description: 'The contract uses block.timestamp for critical logic. This can be slightly manipulated by miners/validators.',
    severity: 'Medium' as Severity,
    recommendation: 'Avoid using block.timestamp for high-precision randomness or time-sensitive critical logic.'
  },
  INTEGER_OVERFLOW_LEGACY: {
    id: 'S008',
    title: 'Integer Overflow (Legacy)',
    description: 'Contract uses arithmetic on versions < 0.8.0 without evidenced SafeMath. This can lead to overflows/underflows.',
    severity: 'High' as Severity,
    recommendation: 'Upgrade to Solidity 0.8.0+ or use OpenZeppelin SafeMath.'
  },
  SHADOWING_VARIABLES: {
    id: 'S009',
    title: 'Variable Shadowing',
    description: 'A local variable or parameter has the same name as a state variable.',
    severity: 'Low' as Severity,
    recommendation: 'Maintain unique naming conventions to avoid confusion and unintended logic bugs.'
  },
  MISSING_VISIBILITY: {
    id: 'S010',
    title: 'Implicit Visibility',
    description: 'Function visibility is not explicitly declared, defaulting to public/internal based on version.',
    severity: 'Medium' as Severity,
    recommendation: 'Explicitly declare visibility (public, private, internal, external) for all functions.'
  },
  UNCHECKED_RET_VAL: {
    id: 'SWC-104',
    title: 'Unchecked Return Value',
    description: 'A low-level call result is not verified. This can fail silently, leading to incorrect contract state.',
    severity: 'High' as Severity,
    recommendation: 'Verify the return value of .call(), .send(), or .delegatecall().'
  },
  LOCKED_ETHER: {
    id: 'SWC-132',
    title: 'Locked Ether',
    description: 'Contract can receive Ether but has no public method to withdraw it.',
    severity: 'High' as Severity,
    recommendation: 'Implement a withdraw() or transfer() function restricted to administrators.'
  },
  CENTRALIZED_RISK: {
    id: 'S013',
    title: 'Centralized Risk (onlyOwner)',
    description: 'Critical functions are protected by onlyOwner but lacks a Timelock or MultiSig governance.',
    severity: 'Medium' as Severity,
    recommendation: 'Transition to a Decentralized Governance (DAO) or implement a 24-48h Timelock.'
  },
  DELEGATECALL_UNTRUSTED: {
    id: 'SWC-112',
    title: 'Untrusted delegatecall',
    description: 'delegatecall() is used to an address that can be influenced by users.',
    severity: 'High' as Severity,
    recommendation: 'Avoid delegatecall unless it is a trusted library or fixed implementation.'
  },
  MISSING_EVENTS: {
    id: 'S015',
    title: 'Missing Events',
    description: 'State-changing functions do not emit an event, making off-chain tracking difficult.',
    severity: 'Low' as Severity,
    recommendation: 'Emit events for all significant state changes (Transfer, Approval, Update).'
  }
};

export const scanContract = (sourceCode: string): SecurityReport => {
  const findings: SecurityFinding[] = [];
  const stateVariables: string[] = [];
  let solidityVersion = '0.8.0';
  let canReceiveEther = false;
  let canWithdrawEther = false;
  
  try {
    let hasContract = false;
    const ast = parser.parse(sourceCode, { range: true, loc: true });
    
    parser.visit(ast, {
      PragmaDirective: (node) => {
        if (node.name === 'solidity') {
          solidityVersion = node.value.replace(/[^0-9.]/g, '') || '0.8.0';
        }
        if (node.value.startsWith('^') || node.value.includes('>') || node.value.includes('<')) {
          findings.push({
            ...RULES.FLOATING_PRAGMA,
            range: node.loc
          });
        }
      },

      StateVariableDeclaration: (node: any) => {
        node.variables.forEach((v: any) => {
          if (v.identifier) stateVariables.push(v.identifier.name);
        });
      },

      // 1. Check for tx.origin & block.timestamp
      MemberAccess: (node) => {
        if (node.expression.type === 'Identifier') {
          if (node.expression.name === 'tx' && node.memberName === 'origin') {
            findings.push({ ...RULES.TX_ORIGIN, range: node.loc });
          }
          if (node.expression.name === 'block' && node.memberName === 'timestamp') {
            findings.push({ ...RULES.TIMESTAMP_DEPENDENCE, range: node.loc });
          }
        }
      },
      
      // 2. Check for insecure blockhash & eth reception
      Identifier: (node) => {
        if (node.name === 'blockhash') {
          findings.push({ ...RULES.INSECURE_RANDOMNESS, range: node.loc });
        }
      },

      // 4. selfdestruct & delegatecall
      FunctionCall: (node) => {
        if (node.expression.type === 'Identifier') {
           if (node.expression.name === 'selfdestruct') {
             findings.push({ ...RULES.SELFDESTRUCT, range: node.loc });
           }
        }
        if (node.expression.type === 'MemberAccess' && node.expression.memberName === 'delegatecall') {
           findings.push({ ...RULES.DELEGATECALL_UNTRUSTED, range: node.loc });
        }
      },

      // 5. Unbounded loops & Variable Shadowing
      ForStatement: (node: any) => {
        if (node.condition && 
            node.condition.type === 'BinaryOperation' && 
            node.condition.right &&
            node.condition.right.type === 'MemberAccess' &&
            node.condition.right.memberName === 'length') {
          findings.push({ ...RULES.UNBOUNDED_LOOP, range: node.loc });
        }
      },

      FunctionDefinition: (node) => {
        // Checking visibility
        if (node.isConstructor === false && !node.visibility) {
           findings.push({ ...RULES.MISSING_VISIBILITY, range: node.loc });
        }

        // Checking shadowing
        node.parameters.forEach((p: any) => {
          if (p.name && stateVariables.includes(p.name)) {
            findings.push({ ...RULES.SHADOWING_VARIABLES, range: p.loc });
          }
        });

        // Check if function receives or withdraws ether
        if (node.isReceiveEther || node.isFallback) canReceiveEther = true;
        if (node.name && (
          node.name.toLowerCase().includes('withdraw') || 
          node.name.toLowerCase().includes('transfer') || 
          node.name.toLowerCase().includes('send') ||
          node.name.toLowerCase().includes('claim')
        )) {
          canWithdrawEther = true;
        }

        // Checking Centralized Risk
        if (node.modifiers) {
          node.modifiers.forEach((mod: any) => {
            if (mod.name === 'onlyOwner') {
               findings.push({ ...RULES.CENTRALIZED_RISK, range: mod.loc });
            }
          });
        }
        
        if (!node.body) return;
        
        let hasExternalCall = false;
        let hasEventEmitted = false;
        let stateChanged = false;

        parser.visit(node.body, {
          FunctionCall: (callNode) => {
            if (callNode.expression.type === 'MemberAccess') {
              const memberName = callNode.expression.memberName;
              if (['call', 'transfer', 'send'].includes(memberName)) {
                hasExternalCall = true;
                canWithdrawEther = true; // Any external call that could be sending ETH
              }
            }
          },
          VariableDeclarationStatement: (varNode: any) => {
            // Check if initialization contains an external call
            if (varNode.initialValue) {
               parser.visit(varNode.initialValue, {
                 FunctionCall: (callNode) => {
                   if (callNode.expression.type === 'MemberAccess' && ['call', 'transfer', 'send'].includes(callNode.expression.memberName)) {
                     hasExternalCall = true;
                   }
                 }
               });
            }
          },
          EmitStatement: () => {
            hasEventEmitted = true;
          },
          ExpressionStatement: (exprNode: any) => {
            if (exprNode.expression && 
                (exprNode.expression.type === 'BinaryOperation' || exprNode.expression.type === 'Assignment') && 
                ['=', '+=', '-=', '*=', '/='].includes(exprNode.expression.operator)) {
              
              stateChanged = true;

              if (hasExternalCall) {
                // Potential Reentrancy!
                findings.push({
                  ...RULES.REENTRANCY,
                  range: exprNode.loc
                });
                hasExternalCall = false; // Reset after finding to avoid duplicates
              }
            }
          },
          BinaryOperation: (binNode) => {
             // Legacy Overflow check
             const versionNum = parseFloat(solidityVersion);
             if (versionNum < 0.8 && ['+', '-', '*', '/'].includes(binNode.operator)) {
               findings.push({ ...RULES.INTEGER_OVERFLOW_LEGACY, range: binNode.loc });
             }
          }
        });

        // Final function wide checks
        if (!node.isConstructor && stateChanged && !hasEventEmitted) {
           findings.push({ ...RULES.MISSING_EVENTS, range: node.loc });
        }
      },
      
      ContractDefinition: () => {
         hasContract = true;
      }

    });

    if (canReceiveEther && !canWithdrawEther) {
       findings.push({ ...RULES.LOCKED_ETHER });
    }

    if (!hasContract) {
       findings.push({
         id: 'S000',
         title: 'No Contract Logic',
         description: 'The file does not contain any contract, interface, or library definitions.',
         severity: 'High' as Severity,
         recommendation: 'Add at least one contract definition to the file.'
       });
    }

  } catch (error) {
    console.warn('Security scan failed to parse AST:', error);
  }

  const summary = {
    high: findings.filter(f => f.severity === 'High').length,
    medium: findings.filter(f => f.severity === 'Medium').length,
    low: findings.filter(f => f.severity === 'Low').length,
    info: findings.filter(f => f.severity === 'Info').length
  };

  let score = 100;
  score -= summary.high * 35;
  score -= summary.medium * 15;
  score -= summary.low * 5;
  
  // Reentrancy is especially dangerous, add extra penalty if found
  if (findings.some(f => f.id === 'S001')) {
    score -= 10;
  }

  score = Math.max(0, score);

  return { score, findings, summary };
};
