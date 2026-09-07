/**
 * Proprietary audit policy for Aethon deploy gate.
 * Implementation lives in cre/shared/deployPolicy.mjs (shared with cre-proxy stub).
 * Evaluated inside the TEE handler (handlerInTee) when CRE is registered —
 * only the final verdict should leave the enclave.
 */
export {
  CONFIDENCE_FLOOR,
  emptyRiskFlags,
  scanSourceHeuristics,
  riskFlagsToMask,
  mergeRiskFlags,
  anyRisk,
  evaluateDeployPolicy,
  verdictToCode,
} from '../../shared/deployPolicy.mjs';

export type CreVerdict = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export interface RiskFlags {
  obfuscatedTax: boolean;
  privilegeEscalation: boolean;
  externalCallRisk: boolean;
  logicBomb: boolean;
}

export interface PolicyInput {
  /** Solidity source (or excerpt) supplied by the IDE */
  sourceCode?: string;
  /** Content hash of the compiled source */
  sourceHash?: string;
  /** Optional on-chain address being promoted */
  contractAddress?: string;
  network?: string;
  /** Mock LLM recommendations when simulating without live models */
  primaryRecommendation?: 'allow' | 'deny' | 'review';
  secondaryRecommendation?: 'allow' | 'deny' | 'review';
  primaryConfidence?: number;
  secondaryConfidence?: number;
}

export interface PolicyResult {
  verdict: CreVerdict;
  riskFlags: RiskFlags;
  riskMask: number;
  reason: string;
  confidence: number;
}
