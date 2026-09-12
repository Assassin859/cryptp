/**
 * Proprietary audit policy for Aethon deploy gate.
 * Values come from generated deployPolicy.ts (synced from cre/shared/deployPolicy.mjs).
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
  type CreVerdict,
  type RiskFlags,
  type PolicyInput,
  type PolicyResult,
} from './deployPolicy.ts';
