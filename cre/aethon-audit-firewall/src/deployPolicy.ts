/**
 * Typed deploy-gate policy for CRE WASM compile + unit tests.
 * Keep in sync with cre/shared/deployPolicy.mjs (used by cre-proxy stub).
 */

export const CONFIDENCE_FLOOR = 0.7;

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

export function emptyRiskFlags(): RiskFlags {
  return {
    obfuscatedTax: false,
    privilegeEscalation: false,
    externalCallRisk: false,
    logicBomb: false,
  };
}

export function scanSourceHeuristics(source: string | undefined): RiskFlags {
  const flags = emptyRiskFlags();
  const s = String(source || '').toLowerCase();

  if (
    /\bsettax\b|\bsetfee\b|\btaxfee\b|_tax\b|\breflectionfee\b|\bexcludefromfee\b|_getreflection|_reflect/.test(
      s
    ) &&
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

export function evaluateDeployPolicy(input: PolicyInput = {}): PolicyResult {
  const source = input.sourceCode || '';
  const heuristic = scanSourceHeuristics(source);

  const hadExplicitModels =
    input.primaryRecommendation !== undefined ||
    input.secondaryRecommendation !== undefined ||
    input.primaryConfidence !== undefined ||
    input.secondaryConfidence !== undefined;

  const primaryRec = input.primaryRecommendation ?? (anyRisk(heuristic) ? 'deny' : 'allow');
  const secondaryRec =
    input.secondaryRecommendation ?? (anyRisk(heuristic) ? 'deny' : 'allow');
  const primaryConf = input.primaryConfidence ?? (anyRisk(heuristic) ? 0.85 : 0.9);
  const secondaryConf = input.secondaryConfidence ?? (anyRisk(heuristic) ? 0.85 : 0.9);

  const modelFlags = emptyRiskFlags();
  if (primaryRec === 'deny' || secondaryRec === 'deny') {
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
      reason: hadExplicitModels
        ? 'Risk flag or model DENY — live deploy blocked'
        : 'Local staging policy flagged risk patterns — live deploy blocked',
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
      reason: hadExplicitModels
        ? 'Model disagreement, low confidence, or review recommended'
        : 'Local staging policy requires manual review',
      confidence,
    };
  }

  return {
    verdict: 'ALLOW',
    riskFlags: merged,
    riskMask: mask,
    reason: hadExplicitModels
      ? 'No risk flags; dual models allow with sufficient confidence'
      : 'Local staging policy found no flagged patterns (not a TEE/CRE verdict)',
    confidence,
  };
}

export function verdictToCode(verdict: CreVerdict): number {
  if (verdict === 'ALLOW') return 1;
  if (verdict === 'DENY') return 2;
  return 3;
}
