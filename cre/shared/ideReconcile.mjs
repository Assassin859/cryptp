/**
 * Pure IDE↔CRE reconcile helper (canonical).
 * Used by cre:unit and imported by src/utils/creClient.ts.
 */
export function reconcileAllowWithIdeHighs(result, highCount) {
  if (result.verdict !== 'ALLOW' || !result.gateable) return result;
  const highs = Number(highCount) || 0;
  if (highs <= 0) return result;
  return {
    ...result,
    verdict: 'MANUAL_REVIEW',
    verdictCode: 3,
    reason: `IDE Problem Audit has ${highs} High finding(s) — manual review before live deploy (CRE staging was ALLOW)`,
    ideReconciled: true,
  };
}

/** Display helper: score < 0 → N/A (never show -1%). */
export function formatSafetyScorePercent(score) {
  if (score == null || Number(score) < 0) return 'N/A';
  return `${Number(score).toFixed(0)}%`;
}
