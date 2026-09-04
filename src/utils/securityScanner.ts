import * as parser from '@solidity-parser/parser';

export type Severity = 'High' | 'Medium' | 'Low' | 'Info';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
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
    critical: number;
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
    confidence: 'High' as Confidence,
    recommendation: 'Use the "Checks-Effects-Interactions" pattern or a reentrancy guard (e.g., OpenZeppelin\'s ReentrancyGuard).'
  },
  TX_ORIGIN: {
    id: 'S002',
    title: 'Use of tx.origin',
    description: 'tx.origin is used for authentication. This can lead to phishing attacks where an intermediate contract can impersonate the user.',
    severity: 'Medium' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Use msg.sender instead of tx.origin for authentication.'
  },
  INSECURE_RANDOMNESS: {
    id: 'S003',
    title: 'Insecure Randomness',
    description: 'block.timestamp or blockhash is used for randomness. These values can be manipulated by miners/validators.',
    severity: 'Medium' as Severity,
    confidence: 'Medium' as Confidence,
    recommendation: 'Use an oracle like Chainlink VRF for secure, verifiable randomness.'
  },
  FLOATING_PRAGMA: {
    id: 'S004',
    title: 'Floating Pragma',
    description: 'The contract uses a floating pragma (e.g., ^0.8.0). This can result in compilation with different compiler versions which may have different bugs.',
    severity: 'Low' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Lock the pragma to a specific version (e.g., 0.8.20).'
  },
  SELFDESTRUCT: {
    id: 'S005',
    title: 'Use of selfdestruct',
    description: 'selfdestruct allows a contract to be deleted, which can be dangerous if the logic is not carefully controlled.',
    severity: 'Medium' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Consider if contract deletion is truly necessary. Note that selfdestruct is deprecated in recent EIPs.'
  },
  UNBOUNDED_LOOP: {
    id: 'S006',
    title: 'Potential Unbounded Loop',
    description: 'Loops over dynamic arrays can exceed the gas limit if the array grows too large.',
    severity: 'Medium' as Severity,
    confidence: 'Medium' as Confidence,
    recommendation: 'Avoid loops over dynamic arrays or implement pagination/limit logic.'
  },
  TIMESTAMP_DEPENDENCE: {
    id: 'S007',
    title: 'Timestamp Dependence',
    description: 'The contract uses block.timestamp for critical logic. This can be slightly manipulated by miners/validators.',
    severity: 'Medium' as Severity,
    confidence: 'Medium' as Confidence,
    recommendation: 'Avoid using block.timestamp for high-precision randomness or time-sensitive critical logic.'
  },
  INTEGER_OVERFLOW_LEGACY: {
    id: 'S008',
    title: 'Integer Overflow (Legacy)',
    description: 'Contract uses arithmetic on versions < 0.8.0 without evidenced SafeMath. This can lead to overflows/underflows.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Upgrade to Solidity 0.8.0+ or use OpenZeppelin SafeMath.'
  },
  SHADOWING_VARIABLES: {
    id: 'S009',
    title: 'Variable Shadowing',
    description: 'A local variable or parameter has the same name as a state variable.',
    severity: 'Low' as Severity,
    confidence: 'Medium' as Confidence,
    recommendation: 'Maintain unique naming conventions to avoid confusion and unintended logic bugs.'
  },
  MISSING_VISIBILITY: {
    id: 'S010',
    title: 'Implicit Visibility',
    description: 'Function visibility is not explicitly declared, defaulting to public/internal based on version.',
    severity: 'Medium' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Explicitly declare visibility (public, private, internal, external) for all functions.'
  },
  UNCHECKED_RET_VAL: {
    id: 'SWC-104',
    title: 'Unchecked Return Value',
    description: 'A low-level call result is not verified. This can fail silently, leading to incorrect contract state.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Verify the return value of .call(), .send(), or .delegatecall().'
  },
  LOCKED_ETHER: {
    id: 'SWC-132',
    title: 'Locked Ether',
    description: 'Contract can receive Ether but has no public method to withdraw it.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Implement a withdraw() or transfer() function restricted to administrators.'
  },
  CENTRALIZED_RISK: {
    id: 'S013',
    title: 'High Centralization Risk',
    description: 'A function gated by onlyOwner allows administrative withdrawal of the contract balance or execution of selfdestruct, creating a single point of failure.',
    severity: 'Medium' as Severity,
    confidence: 'Medium' as Confidence,
    recommendation: 'Add a TimelockController (OpenZeppelin) or use a MultiSig wallet (e.g. Gnosis Safe) for admin operations.'
  },
  DELEGATECALL_UNTRUSTED: {
    id: 'SWC-112',
    title: 'Untrusted delegatecall',
    description: 'delegatecall() is used to an address that can be influenced by users.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Avoid delegatecall unless it is a trusted library or fixed implementation.'
  },
  MISSING_EVENTS: {
    id: 'S015',
    title: 'Missing Events',
    description: 'State-changing functions do not emit an event, making off-chain tracking difficult.',
    severity: 'Low' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Emit events for all significant state changes (Transfer, Approval, Update).'
  },
  MISSING_ACCESS_CONTROL: {
    id: 'S016',
    title: 'Missing Access Control',
    description: 'Critical state-changing function is public/external but lacks access control modifiers or caller validation checks.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Add appropriate access control modifiers (onlyOwner, onlyRole) or explicit require/revert checks verifying msg.sender.'
  },
  CALL_IN_LOOP: {
    id: 'S017',
    title: 'External Call in Loop',
    description: 'External call (.call, .transfer, or .send) is executed inside a loop. If one call fails or consumes too much gas, the entire transaction reverts (DoS).',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Avoid external calls in loops. Implement a pull-payment pattern or pagination instead.'
  },
  DELEGATECALL_IN_LOOP: {
    id: 'S018',
    title: 'Delegatecall in Loop',
    description: 'delegatecall is executed inside a loop, which can lead to unpredictable state updates or gas exhaustion.',
    severity: 'High' as Severity,
    confidence: 'High' as Confidence,
    recommendation: 'Refactor code to avoid running delegatecall inside loop iterations.'
  }
};

export const scanContract = (sourceCode: string): SecurityReport => {
  const trimmedCode = sourceCode.trim();
  const lines = trimmedCode.split('\n');
  const nonCommentLines = lines.filter(line => {
    const l = line.trim();
    return l.length > 0 && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*');
  });

  if (nonCommentLines.length === 0 || (nonCommentLines.length === 1 && nonCommentLines[0].includes('pragma'))) {
    return {
      score: -1,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    };
  }

  const findings: SecurityFinding[] = [];
  const stateVariables: string[] = [];
  let solidityVersion = '0.8.0';
  let canReceiveEther = false;
  let canWithdrawEther = false;

  const criticalVerbs = [
    'transferownership', 'setowner', 'setadmin', 'kill', 'selfdestruct', 
    'mint', 'burn', 'withdraw', 'emergencydrain', 'drain', 
    'pause', 'unpause', 'upgrade', 'initialize'
  ];

  let parseFailed = false;

  try {
    let hasContract = false;
    const ast = parser.parse(sourceCode, { range: true, loc: true, tolerant: true });

    // 1. Gather all state variables
    parser.visit(ast, {
      StateVariableDeclaration: (node: any) => {
        if (node.variables) {
          node.variables.forEach((v: any) => {
            if (v) {
              if (v.name) {
                stateVariables.push(v.name);
              } else if (v.identifier && v.identifier.name) {
                stateVariables.push(v.identifier.name);
              }
            }
          });
        }
      }
    });

    // Helper to resolve the base identifier of an expression (handles IndexAccess, MemberAccess)
    const getBaseIdentifier = (node: any): string | null => {
      if (!node) return null;
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'IndexAccess') return getBaseIdentifier(node.base);
      if (node.type === 'MemberAccess') return getBaseIdentifier(node.expression);
      return null;
    };

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

      Identifier: (node) => {
        if (node.name === 'blockhash') {
          findings.push({ ...RULES.INSECURE_RANDOMNESS, range: node.loc });
        }
      },

      FunctionCall: (node) => {
        const exprAny = node.expression as any;
        if (exprAny.type === 'Identifier' && exprAny.name === 'selfdestruct') {
          findings.push({ ...RULES.SELFDESTRUCT, range: node.loc });
        }

        // Delegatecall checks
        let isDelegatecall = false;
        let targetExpr: any = null;

        if (exprAny.type === 'MemberAccess' && exprAny.memberName === 'delegatecall') {
          isDelegatecall = true;
          targetExpr = exprAny.expression;
        } else if (
          (exprAny.type === 'FunctionCallOptions' || exprAny.type === 'NameValueExpression') && 
          exprAny.expression &&
          exprAny.expression.type === 'MemberAccess' && 
          exprAny.expression.memberName === 'delegatecall'
        ) {
          isDelegatecall = true;
          targetExpr = exprAny.expression.expression;
        }

        if (isDelegatecall && targetExpr) {
          const targetName = getBaseIdentifier(targetExpr);
          const isStaticTarget = targetName && ['target', 'implementation', 'logic'].includes(targetName.toLowerCase());
          if (!isStaticTarget) {
            findings.push({ ...RULES.DELEGATECALL_UNTRUSTED, range: node.loc });
          }
        }
      },

      // Unbounded loops: S006
      ForStatement: (node: any) => {
        const cond = node.conditionExpression;
        if (
          cond &&
          cond.type === 'BinaryOperation' &&
          cond.right?.type === 'MemberAccess' &&
          cond.right.memberName === 'length'
        ) {
          findings.push({ ...RULES.UNBOUNDED_LOOP, range: node.loc });
        }
      },
      WhileStatement: (node: any) => {
        const cond = node.condition;
        if (
          cond &&
          cond.type === 'BinaryOperation' &&
          cond.right?.type === 'MemberAccess' &&
          cond.right.memberName === 'length'
        ) {
          findings.push({ ...RULES.UNBOUNDED_LOOP, range: node.loc });
        }
      },

      FunctionDefinition: (node) => {
        if (node.isConstructor) return;

        // Skip internal or private functions for access control
        const isInternalOrPrivate = node.visibility === 'internal' || node.visibility === 'private';

        // Check if there are access control modifiers
        const hasAccessControlModifier = node.modifiers && node.modifiers.some((mod: any) => {
          const name = mod.name.toLowerCase();
          return name.includes('owner') || name.includes('role') || name.includes('admin') || name.includes('auth') || name.includes('guard');
        });

        // Check if function name matches critical verbs
        const fnName = node.name ? node.name.toLowerCase() : '';
        const isCriticalVerb = criticalVerbs.includes(fnName);
        const isFallbackOrReceive = node.isReceiveEther || node.isFallback || fnName === 'receive' || fnName === 'fallback';

        // Look inside function body
        if (node.body) {
          let hasMsgSenderCheck = false;
          const externalCallLines: number[] = [];
          const stateWriteLines: number[] = [];
          let stateChanged = false;
          let hasEventEmitted = false;
          const hasOnlyOwner = node.modifiers && node.modifiers.some((mod: any) => mod.name === 'onlyOwner');

          // Detect if this function transfers balance or selfdestructs
          let transfersBalanceOrSelfdestructs = false;

          parser.visit(node.body, {
            // Find msg.sender checks
            BinaryOperation: (binNode) => {
              if (
                (binNode.left.type === 'Identifier' && binNode.left.name === 'msg' && binNode.right.type === 'Identifier') ||
                (binNode.right.type === 'Identifier' && binNode.right.name === 'msg')
              ) {
                hasMsgSenderCheck = true;
              }
              const versionNum = parseFloat(solidityVersion);
              if (versionNum < 0.8 && ['+', '-', '*', '/'].includes(binNode.operator)) {
                findings.push({ ...RULES.INTEGER_OVERFLOW_LEGACY, range: binNode.loc });
              }
            },
            MemberAccess: (memNode) => {
              if (memNode.expression.type === 'Identifier' && memNode.expression.name === 'msg' && memNode.memberName === 'sender') {
                hasMsgSenderCheck = true;
              }
              if (
                memNode.memberName === 'balance' && 
                memNode.expression.type === 'FunctionCall' && 
                memNode.expression.expression.type === 'Identifier' && 
                memNode.expression.expression.name === 'address'
              ) {
                transfersBalanceOrSelfdestructs = true;
              }
            },
            // Find external calls
            FunctionCall: (callNode) => {
              let isCall = false;
              const callExprAny = callNode.expression as any;

              if (callExprAny.type === 'MemberAccess') {
                const memberName = callExprAny.memberName;
                if (['call', 'transfer', 'send'].includes(memberName)) {
                  isCall = true;
                  canWithdrawEther = true;
                }
              } else if (
                (callExprAny.type === 'FunctionCallOptions' || callExprAny.type === 'NameValueExpression') &&
                callExprAny.expression &&
                callExprAny.expression.type === 'MemberAccess'
              ) {
                const memberName = callExprAny.expression.memberName;
                if (['call', 'transfer', 'send'].includes(memberName)) {
                  isCall = true;
                  canWithdrawEther = true;
                }
              }

              if (isCall && callNode.loc) {
                externalCallLines.push(callNode.loc.start.line);
              }

              if (callExprAny.type === 'Identifier' && callExprAny.name === 'selfdestruct') {
                transfersBalanceOrSelfdestructs = true;
              }
            },
            // State writes and updates captured inside ExpressionStatement
            ExpressionStatement: (exprNode: any) => {
              const expr = exprNode.expression;
              if (!expr) return;
              let baseVar: string | null = null;
              let isStateWrite = false;

              if (expr.type === 'BinaryOperation' && ['=', '+=', '-=', '*=', '/='].includes(expr.operator)) {
                baseVar = getBaseIdentifier(expr.left);
                isStateWrite = baseVar !== null && stateVariables.includes(baseVar);
              } else if (
                (expr.type === 'UnaryOperation' && ['++', '--'].includes(expr.operator)) ||
                expr.type === 'UpdateExpression'
              ) {
                const arg = expr.argument || expr.expression;
                baseVar = getBaseIdentifier(arg);
                isStateWrite = baseVar !== null && stateVariables.includes(baseVar);
              }

              if (isStateWrite) {
                stateChanged = true;
                if (exprNode.loc) {
                  stateWriteLines.push(exprNode.loc.start.line);
                }
              }
            },
            EmitStatement: () => {
              hasEventEmitted = true;
            }
          });

          // Check loops in function body for S017 and S018
          const checkLoopNode = (loopBody: any) => {
            if (!loopBody) return;
            parser.visit(loopBody, {
              FunctionCall: (callNode) => {
                let isCall = false;
                let isDelegate = false;
                const callExprAny = callNode.expression as any;

                if (callExprAny.type === 'MemberAccess') {
                  const memberName = callExprAny.memberName;
                  if (['call', 'transfer', 'send'].includes(memberName)) isCall = true;
                  if (memberName === 'delegatecall') isDelegate = true;
                } else if (
                  (callExprAny.type === 'FunctionCallOptions' || callExprAny.type === 'NameValueExpression') &&
                  callExprAny.expression &&
                  callExprAny.expression.type === 'MemberAccess'
                ) {
                  const memberName = callExprAny.expression.memberName;
                  if (['call', 'transfer', 'send'].includes(memberName)) isCall = true;
                  if (memberName === 'delegatecall') isDelegate = true;
                }

                if (isCall) {
                  findings.push({ ...RULES.CALL_IN_LOOP, range: callNode.loc || undefined });
                }
                if (isDelegate) {
                  findings.push({ ...RULES.DELEGATECALL_IN_LOOP, range: callNode.loc || undefined });
                }
              }
            });
          };

          parser.visit(node.body, {
            ForStatement: (loopNode) => {
              checkLoopNode(loopNode.body);
            },
            WhileStatement: (loopNode) => {
              checkLoopNode(loopNode.body);
            },
            DoWhileStatement: (loopNode) => {
              checkLoopNode(loopNode.body);
            }
          });

          // Centralization Risk: S013
          if (hasOnlyOwner && transfersBalanceOrSelfdestructs) {
            findings.push({ ...RULES.CENTRALIZED_RISK, range: node.loc });
          }

          // Reentrancy: S001 (Line number comparison)
          const hasReentrancyGuard = node.modifiers && node.modifiers.some((mod: any) => {
            const name = mod.name.toLowerCase();
            return name === 'nonreentrant' || name === 'lock';
          });

          if (!hasReentrancyGuard && externalCallLines.length > 0 && stateWriteLines.length > 0) {
            const hasPostCallWrite = stateWriteLines.some(writeLine => {
              return externalCallLines.some(callLine => writeLine > callLine);
            });
            if (hasPostCallWrite) {
              findings.push({ ...RULES.REENTRANCY, range: node.loc });
            }
          }

          // Missing Access Control: S016
          if (!isInternalOrPrivate && (isCriticalVerb || isFallbackOrReceive)) {
            if (!hasAccessControlModifier && !hasMsgSenderCheck) {
              findings.push({ ...RULES.MISSING_ACCESS_CONTROL, range: node.loc });
            }
          }

          // Missing Events: S015
          const isReadOnly = node.stateMutability === 'view' || node.stateMutability === 'pure';
          if (!isReadOnly && stateChanged && !hasEventEmitted) {
            findings.push({ ...RULES.MISSING_EVENTS, range: node.loc });
          }

          // Implicit visibility
          if (!node.visibility || node.visibility === 'default') {
            findings.push({ ...RULES.MISSING_VISIBILITY, range: node.loc });
          }

          // Check if functions receives or withdraws ether
          if (node.isReceiveEther || node.isFallback) canReceiveEther = true;
          if (node.name && (
            node.name.toLowerCase().includes('withdraw') || 
            node.name.toLowerCase().includes('transfer') || 
            node.name.toLowerCase().includes('send') ||
            node.name.toLowerCase().includes('claim')
          )) {
            canWithdrawEther = true;
          }
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
        confidence: 'High' as Confidence,
        recommendation: 'Add at least one contract definition to the file.'
      });
    }

  } catch (error) {
    parseFailed = true;
    console.debug('[Forensic] Security scan skipped AST analysis (Syntax in flux):', error);
    findings.push({
      id: 'PARSE_ERROR',
      title: 'Solidity Parse Error',
      description: 'Source could not be parsed; security scan incomplete.',
      severity: 'High' as Severity,
      confidence: 'High' as Confidence,
      recommendation: 'Fix syntax errors before trusting the security score.',
    });
  }

  const hasCriticalReentrancy = findings.some(f => f.id === 'S001');

  const summary = {
    critical: hasCriticalReentrancy ? 1 : 0,
    high: findings.filter(f => f.severity === 'High' && f.id !== 'S001').length,
    medium: findings.filter(f => f.severity === 'Medium').length,
    low: findings.filter(f => f.severity === 'Low').length,
    info: findings.filter(f => f.severity === 'Info').length
  };

  let score = 100;
  score -= summary.critical * 50;
  score -= summary.high * 35;
  score -= summary.medium * 10;
  score -= summary.low * 3;

  let activeCap = 100;
  if (summary.critical > 0) activeCap = Math.min(activeCap, 20);
  
  const totalHighs = (hasCriticalReentrancy ? 1 : 0) + summary.high;
  if (totalHighs >= 2) activeCap = Math.min(activeCap, 30);
  else if (totalHighs === 1) activeCap = Math.min(activeCap, 60);

  if (summary.medium > 0) activeCap = Math.min(activeCap, 75);

  score = Math.min(score, activeCap);
  if (parseFailed) score = Math.min(score, 40);
  score = Math.max(0, score);

  return { score, findings, summary };
};
