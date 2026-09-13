/**
 * Format The Graph indexed history for Continuity IDE / Confidential audit context.
 */
import {
  fetchIndexedContract,
  fetchValueChangedForContract,
  fetchVerdictReceivedForContract,
  isGraphConfigured,
  type ValueChangedRow,
  type VerdictReceivedRow,
} from './graphClient';

export type GraphAuditContext = {
  configured: boolean;
  registered: boolean | null;
  summary: string;
  events: ValueChangedRow[];
  verdicts: VerdictReceivedRow[];
};

const VERDICT_LABEL: Record<number, string> = {
  1: 'ALLOW',
  2: 'DENY',
  3: 'MANUAL_REVIEW',
};

export function formatValueChangedBlurb(
  events: ValueChangedRow[],
  opts?: { registered?: boolean | null; max?: number }
): string {
  const max = opts?.max ?? 5;
  const lines: string[] = ['Onchain history (The Graph):'];
  if (opts?.registered === true) lines.push('- Contract is registered for indexing.');
  if (opts?.registered === false) lines.push('- Contract is not registered in the subgraph yet.');
  if (!events.length) {
    lines.push('- No ValueChanged events indexed yet.');
    return lines.join('\n');
  }
  lines.push(`- Latest ${Math.min(events.length, max)} ValueChanged event(s):`);
  for (const e of events.slice(0, max)) {
    const when = e.blockTimestamp
      ? new Date(Number(e.blockTimestamp) * 1000).toISOString()
      : 'unknown time';
    lines.push(
      `  · block ${e.blockNumber} · value=${e.newValue} · setter=${e.setter?.slice(0, 10) ?? '?'}… · ${when}`
    );
  }
  return lines.join('\n');
}

export function formatVerdictReceivedBlurb(
  verdicts: VerdictReceivedRow[],
  opts?: { max?: number }
): string {
  const max = opts?.max ?? 5;
  if (!verdicts.length) {
    return '- No VerdictReceived events indexed yet.';
  }
  const lines: string[] = [
    `- Latest ${Math.min(verdicts.length, max)} VerdictReceived event(s):`,
  ];
  for (const v of verdicts.slice(0, max)) {
    const code = Number(v.verdictCode);
    const label = VERDICT_LABEL[code] ?? `code=${code}`;
    const when = v.blockTimestamp
      ? new Date(Number(v.blockTimestamp) * 1000).toISOString()
      : 'unknown time';
    lines.push(
      `  · block ${v.blockNumber} · verdictCode=${code} (${label}) · riskMask=${v.riskMask} · reporter=${v.reporter?.slice(0, 10) ?? '?'}… · ${when}`
    );
  }
  return lines.join('\n');
}

/** Load Indexed registration + recent ValueChanged / VerdictReceived rows for a Sepolia contract. */
export async function loadGraphAuditContext(
  contractAddress: string | undefined | null
): Promise<GraphAuditContext> {
  if (!contractAddress?.trim()) {
    return {
      configured: isGraphConfigured(),
      registered: null,
      summary: 'Onchain history (The Graph): no contract address selected.',
      events: [],
      verdicts: [],
    };
  }
  if (!isGraphConfigured()) {
    return {
      configured: false,
      registered: null,
      summary:
        'Onchain history (The Graph): endpoint not configured (Settings → The Graph or Indexed → Studio).',
      events: [],
      verdicts: [],
    };
  }
  try {
    const [indexed, events, verdicts] = await Promise.all([
      fetchIndexedContract(contractAddress),
      fetchValueChangedForContract(contractAddress, 5),
      fetchVerdictReceivedForContract(contractAddress, 5),
    ]);
    const registered = Boolean(indexed);
    const base = formatValueChangedBlurb(events, { registered });
    const verdictBlurb = formatVerdictReceivedBlurb(verdicts);
    const kindNote = indexed?.kind
      ? `\n- Registry kind: ${indexed.kind}`
      : '';
    return {
      configured: true,
      registered,
      summary: `${base}\n${verdictBlurb}${kindNote}`,
      events,
      verdicts,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      configured: true,
      registered: null,
      summary: `Onchain history (The Graph): query failed — ${msg}`,
      events: [],
      verdicts: [],
    };
  }
}

/** True when Indexed history suggests prior DENY for continuity soft-review. */
export function graphSuggestsManualReview(ctx: GraphAuditContext | null | undefined): boolean {
  if (!ctx) return false;
  if (ctx.verdicts?.some((v) => Number(v.verdictCode) === 2)) return true;
  if (!ctx.summary) return false;
  return /DENY|verdictCode[=:]?\s*2/i.test(ctx.summary);
}
