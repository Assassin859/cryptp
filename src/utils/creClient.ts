/**
 * Client for Aethon ↔ CRE confidential audit proxy.
 */
import { computeContentHash } from './userData';
import {
  getCreAuditToken,
  getCreTriggerUrl,
  getCreUserPrefs,
  isCreConfigured,
  isCreGateEnabled,
} from './creConstants';

export type CreVerdict = 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';

export type CreAuditMode = 'stub' | 'live' | 'accepted';

export interface CreAuditRequest {
  sourceCode: string;
  sourceHash: string;
  contractAddress?: string;
  network?: string;
  abiHint?: string;
}

export interface CreAuditResult {
  verdict: CreVerdict | null;
  verdictCode: number;
  riskMask: number;
  reason: string;
  sourceHash: string;
  mode: CreAuditMode;
  executionId?: string;
  confidential: boolean;
  /** False for accepted/pending live — cannot unlock MetaMask deploy. */
  gateable: boolean;
  at: number;
}

export class CreClientError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'http' | 'network' | 'parse' | 'hash_mismatch'
  ) {
    super(message);
    this.name = 'CreClientError';
  }
}

const cache = new Map<string, CreAuditResult>();

function normalizeHash(hash: string): string {
  return hash.trim().replace(/^0x/i, '').toLowerCase();
}

export function getCachedCreVerdict(sourceHash: string): CreAuditResult | undefined {
  return cache.get(normalizeHash(sourceHash));
}

export function clearCreVerdictCache(): void {
  cache.clear();
}

/** Drop a single hash entry (e.g. on recompile of that source set). */
export function clearCreVerdictForHash(sourceHash: string): void {
  if (!sourceHash) return;
  cache.delete(normalizeHash(sourceHash));
}

export function storeCreVerdict(result: CreAuditResult): void {
  if (!result.sourceHash) return;
  // Only cache gateable stub/live verdicts for deploy unlock.
  if (!result.gateable || !result.verdict) return;
  cache.set(normalizeHash(result.sourceHash), result);
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
  if (!cached.gateable || cached.mode === 'accepted' || !cached.verdict) {
    return {
      ok: false,
      needsConfirm: false,
      result: cached,
      message:
        'CRE workflow accepted but no gateable verdict yet. Use Stub/staging mode for a local policy result, or wait until execution results are wired.',
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

export async function assertClientSourceHash(
  sourceCode: string,
  sourceHash: string
): Promise<string> {
  const computed = await computeContentHash(sourceCode);
  const expected = normalizeHash(computed);
  const got = normalizeHash(sourceHash);
  if (!got || expected !== got) {
    throw new CreClientError(
      'Recompile before confidential audit. Editor source does not match the compiled content hash.',
      'hash_mismatch'
    );
  }
  return expected;
}

export async function requestCreAudit(req: CreAuditRequest): Promise<CreAuditResult> {
  if (!isCreConfigured()) {
    throw new CreClientError(
      'CRE trigger URL not configured. Set VITE_CRE_TRIGGER_URL or run compiler backend on :3001.',
      'not_configured'
    );
  }

  const boundHash = await assertClientSourceHash(req.sourceCode, req.sourceHash);

  const url = getCreTriggerUrl();
  const prefs = getCreUserPrefs();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auditToken = getCreAuditToken();
  if (auditToken) {
    headers.Authorization = `Bearer ${auditToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sourceCode: req.sourceCode,
        sourceHash: boundHash,
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

  let body: Partial<CreAuditResult> & { error?: string; gatewayStatus?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new CreClientError('Invalid JSON from CRE proxy', 'parse');
  }

  if (body.error) {
    throw new CreClientError(body.error, 'http');
  }

  const mode: CreAuditMode =
    body.mode === 'accepted' || body.mode === 'live' || body.mode === 'stub'
      ? body.mode
      : 'stub';

  // Live path returns accepted/pending without a gateable verdict.
  if (mode === 'accepted') {
    return {
      verdict: null,
      verdictCode: 0,
      riskMask: body.riskMask ?? 0,
      reason: body.reason || 'CRE workflow accepted; no gateable verdict yet',
      sourceHash: normalizeHash(body.sourceHash || boundHash),
      mode: 'accepted',
      executionId: body.executionId,
      confidential: body.confidential !== false,
      gateable: false,
      at: body.at || Date.now(),
    };
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
    sourceHash: normalizeHash(body.sourceHash || boundHash),
    mode: mode === 'live' ? 'live' : 'stub',
    executionId: body.executionId,
    confidential: body.confidential === true,
    gateable: body.gateable === true,
    at: body.at || Date.now(),
  };

  storeCreVerdict(result);
  return result;
}
