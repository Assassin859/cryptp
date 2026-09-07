/**
 * Proprietary audit policy for Aethon deploy gate.
 * Evaluated inside the TEE handler (handlerInTee) so thresholds and
 * intermediate flags never leave the enclave — only the final verdict does.
 */

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

const CONFIDENCE_FLOOR = 0.7;

export function emptyRiskFlags(): RiskFlags {
  return {
    obfuscatedTax: false,
    privilegeEscalation: false,
    externalCallRisk: false,
    logicBomb: false,
  };
}

/** Heuristic scan of source — mirrors IDE tier-0 patterns for staging / stub. */
export function scanSourceHeuristics(source: string): RiskFlags {
  const flags = emptyRiskFlags();
  const s = source.toLowerCase();

  if (
    /tax|fee|reflection/.test(s) &&
    /onlyowner|owner\s*\(/.test(s) &&
    /transfer|swap/.test(s)
  ) {
    flags.obfuscatedTax = true;
  }
  if (
    /selfdestruct|delegatecall/.test(s) ||
    (/onlyowner/.test(s) && /mint|withdraw|drain|rug/.test(s))
  ) {
    flags.privilegeEscalation = true;
  }
  if (/\.call\s*\{|\.call\(|delegatecall|staticcall/.test(s)) {
    flags.externalCallRisk = true;
  }
  if (/block\.timestamp|blockhash|tx\.origin/.test(s) && /random|lottery|gambl/.test(s)) {
    flags.logicBomb = true;
  }
  return flags;
}

export function riskFlagsToMask(flags: RiskFlags): number {
  let mask = 0;
  if (flags.obfuscatedTax) mask |= 1 << 0;
  if (flags.privilegeEscalation) mask |= 1 << 1;
  if (flags.externalCallRisk) mask |= 1 << 2;
  if (flags.logicBomb) mask |= 1 << 3;
  return mask;
}

export function mergeRiskFlags(a: RiskFlags, b: RiskFlags): RiskFlags {
  return {
    obfuscatedTax: a.obfuscatedTax || b.obfuscatedTax,
    privilegeEscalation: a.privilegeEscalation || b.privilegeEscalation,
    externalCallRisk: a.externalCallRisk || b.externalCallRisk,
    logicBomb: a.logicBomb || b.logicBomb,
  };
}

export function anyRisk(flags: RiskFlags): boolean {
  return (
    flags.obfuscatedTax ||
    flags.privilegeEscalation ||
    flags.externalCallRisk ||
    flags.logicBomb
  );
}

/**
 * Core confidential policy: combine source heuristics with dual-model signals.
 * Only the returned verdict/mask should cross usingTheDons().
 */
export function evaluateDeployPolicy(input: PolicyInput): PolicyResult {
  const source = input.sourceCode || '';
  const heuristic = scanSourceHeuristics(source);

  const primaryRec = input.primaryRecommendation ?? (anyRisk(heuristic) ? 'deny' : 'allow');
  const secondaryRec =
    input.secondaryRecommendation ?? (anyRisk(heuristic) ? 'deny' : 'allow');
  const primaryConf = input.primaryConfidence ?? (anyRisk(heuristic) ? 0.85 : 0.9);
  const secondaryConf = input.secondaryConfidence ?? (anyRisk(heuristic) ? 0.85 : 0.9);

  const modelFlags = emptyRiskFlags();
  if (primaryRec === 'deny' || secondaryRec === 'deny') {
    // Attribute deny to privilege escalation when heuristics empty but models deny
    if (!anyRisk(heuristic)) modelFlags.privilegeEscalation = true;
  }
  const merged = mergeRiskFlags(heuristic, modelFlags);
  const mask = riskFlagsToMask(merged);
  const confidence = Math.min(primaryConf, secondaryConf);

  if (anyRisk(merged) || primaryRec === 'deny' || secondaryRec === 'deny') {
    return {
      verdict: 'DENY',
      riskFlags: merged,
      riskMask: mask,
      reason: 'Risk flag or model DENY — live deploy blocked',
      confidence,
    };
  }

  if (
    primaryRec === 'review' ||
    secondaryRec === 'review' ||
    primaryRec !== secondaryRec ||
    confidence < CONFIDENCE_FLOOR
  ) {
    return {
      verdict: 'MANUAL_REVIEW',
      riskFlags: merged,
      riskMask: mask,
      reason: 'Model disagreement, low confidence, or review recommended',
      confidence,
    };
  }

  return {
    verdict: 'ALLOW',
    riskFlags: merged,
    riskMask: mask,
    reason: 'No risk flags; dual models allow with sufficient confidence',
    confidence,
  };
}

export function verdictToCode(verdict: CreVerdict): number {
  if (verdict === 'ALLOW') return 1;
  if (verdict === 'DENY') return 2;
  return 3;
}
