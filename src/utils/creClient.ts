/**
 * Client for Aethon ↔ CRE confidential audit proxy.
 */
import {
  getCreTriggerUrl,
  getCreUserPrefs,
  isCreConfigured,
  isCreGateEnabled,
} from './creConstants';

export type CreVerdict = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export interface CreAuditRequest {
  sourceCode: string;
  sourceHash: string;
  contractAddress?: string;
  network?: string;
  abiHint?: string;
}

export interface CreAuditResult {
  verdict: CreVerdict;
  verdictCode: number;
  riskMask: number;
  reason: string;
  sourceHash: string;
  mode: 'stub' | 'live';
  executionId?: string;
  confidential: boolean;
  at: number;
}

export class CreClientError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'http' | 'network' | 'parse'
  ) {
    super(message);
    this.name = 'CreClientError';
  }
}

const cache = new Map<string, CreAuditResult>();

export function getCachedCreVerdict(sourceHash: string): CreAuditResult | undefined {
  return cache.get(sourceHash);
}

export function clearCreVerdictCache(): void {
  cache.clear();
}

export function storeCreVerdict(result: CreAuditResult): void {
  if (result.sourceHash) cache.set(result.sourceHash, result);
}

/** Whether live MetaMask deploy is allowed for this hash under current prefs. */
export function creAllowsLiveDeploy(sourceHash: string): {
  ok: boolean;
  needsConfirm: boolean;
  result?: CreAuditResult;
  message: string;
} {
  if (!isCreGateEnabled()) {
    return { ok: true, needsConfirm: false, message: 'CRE gate disabled in Settings' };
  }
  const cached = getCachedCreVerdict(sourceHash);
  if (!cached) {
    return {
      ok: false,
      needsConfirm: false,
      message: 'Run Confidential audit (Problem Audit → Confidential) before live deploy',
    };
  }
  if (cached.verdict === 'ALLOW') {
    return { ok: true, needsConfirm: false, result: cached, message: 'CRE ALLOW' };
  }
  if (cached.verdict === 'MANUAL_REVIEW') {
    return {
      ok: false,
      needsConfirm: true,
      result: cached,
      message: 'CRE MANUAL_REVIEW — confirm to proceed or fix findings',
    };
  }
  return {
    ok: false,
    needsConfirm: false,
    result: cached,
    message: `CRE DENY — ${cached.reason}`,
  };
}

export async function requestCreAudit(req: CreAuditRequest): Promise<CreAuditResult> {
  if (!isCreConfigured()) {
    throw new CreClientError(
      'CRE trigger URL not configured. Set VITE_CRE_TRIGGER_URL or run compiler backend on :3001.',
      'not_configured'
    );
  }

  const url = getCreTriggerUrl();
  const prefs = getCreUserPrefs();

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCode: req.sourceCode,
        sourceHash: req.sourceHash,
        contractAddress: req.contractAddress,
        network: req.network || 'sepolia',
        abiHint: req.abiHint,
        mode: prefs.mode,
      }),
    });
  } catch (e) {
    throw new CreClientError(
      e instanceof Error ? e.message : 'Network error calling CRE proxy',
      'network'
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new CreClientError(`CRE proxy HTTP ${res.status}: ${text.slice(0, 200)}`, 'http');
  }

  let body: Partial<CreAuditResult> & { error?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new CreClientError('Invalid JSON from CRE proxy', 'parse');
  }

  if (body.error) {
    throw new CreClientError(body.error, 'http');
  }

  const verdict = body.verdict;
  if (verdict !== 'ALLOW' && verdict !== 'DENY' && verdict !== 'MANUAL_REVIEW') {
    throw new CreClientError('Proxy response missing verdict', 'parse');
  }

  const result: CreAuditResult = {
    verdict,
    verdictCode: body.verdictCode ?? (verdict === 'ALLOW' ? 1 : verdict === 'DENY' ? 2 : 3),
    riskMask: body.riskMask ?? 0,
    reason: body.reason || '',
    sourceHash: body.sourceHash || req.sourceHash,
    mode: body.mode === 'live' ? 'live' : 'stub',
    executionId: body.executionId,
    confidential: body.confidential !== false,
    at: body.at || Date.now(),
  };

  storeCreVerdict(result);
  return result;
}
