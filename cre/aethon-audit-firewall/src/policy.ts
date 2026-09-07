/**
 * Proprietary audit policy for Aethon deploy gate.
 * Typed implementation for CRE WASM; keep cre/shared/deployPolicy.mjs in sync for the proxy stub.
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
