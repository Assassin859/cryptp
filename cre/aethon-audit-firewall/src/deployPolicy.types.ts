/**
 * Hand-maintained types for the CRE package.
 * Implementation is generated into deployPolicy.ts from cre/shared/deployPolicy.mjs
 * via `npm run cre:sync-policy`.
 */

export type CreVerdict = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export interface RiskFlags {
  obfuscatedTax: boolean;
  privilegeEscalation: boolean;
  externalCallRisk: boolean;
  logicBomb: boolean;
}

export interface PolicyInput {
  sourceCode?: string;
  sourceHash?: string;
  contractAddress?: string;
  network?: string;
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
