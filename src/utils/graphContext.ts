/**
 * Format The Graph indexed history for Continuity IDE / Confidential audit context.
 */
import {
  fetchIndexedContract,
  fetchValueChangedForContract,
  isGraphConfigured,
  type ValueChangedRow,
} from './graphClient';

export type GraphAuditContext = {
  configured: boolean;
  registered: boolean | null;
  summary: string;
  events: ValueChangedRow[];
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

/** Load Indexed registration + recent ValueChanged rows for a Sepolia contract. */
export async function loadGraphAuditContext(
  contractAddress: string | undefined | null
): Promise<GraphAuditContext> {
  if (!contractAddress?.trim()) {
    return {
      configured: isGraphConfigured(),
      registered: null,
      summary: 'Onchain history (The Graph): no contract address selected.',
      events: [],
    };
  }
  if (!isGraphConfigured()) {
    return {
      configured: false,
      registered: null,
      summary:
        'Onchain history (The Graph): endpoint not configured (Settings → The Graph or Indexed → Studio).',
      events: [],
    };
  }
  try {
    const [indexed, events] = await Promise.all([
      fetchIndexedContract(contractAddress),
      fetchValueChangedForContract(contractAddress, 5),
    ]);
    const registered = Boolean(indexed);
    return {
      configured: true,
      registered,
      summary: formatValueChangedBlurb(events, { registered }),
      events,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      configured: true,
      registered: null,
      summary: `Onchain history (The Graph): query failed — ${msg}`,
      events: [],
    };
  }
}
