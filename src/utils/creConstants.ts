/**
 * Shared CRE Confidential audit gate prefs (mirrors graphConstants).
 * Storage key includes `-keys` so Auth/App idle logout preserves it.
 */
export const CRE_KEYS_STORAGE = 'cryptp-cre-keys';

export type CreGateMode = 'stub' | 'live';

export interface CreUserPrefs {
  /** When true, MetaMask deploy/promote requires ALLOW (or confirmed MANUAL_REVIEW). */
  gateEnabled: boolean;
  mode: CreGateMode;
  /** Override trigger URL (defaults to VITE_CRE_TRIGGER_URL) */
  triggerUrl: string;
  /** Override workflow id for display / live mode */
  workflowId: string;
  /** Sepolia AuditFirewallConsumer */
  consumerAddress: string;
}

const DEFAULT_PREFS: CreUserPrefs = {
  gateEnabled: true,
  mode: 'stub',
  triggerUrl: '',
  workflowId: '',
  consumerAddress: '',
};

function notifyCrePrefsChanged(): void {
  try {
    window.dispatchEvent(new Event('cryptp-cre-prefs'));
  } catch {
    /* ignore */
  }
}

export function getCreUserPrefs(): CreUserPrefs {
  try {
    const raw = localStorage.getItem(CRE_KEYS_STORAGE);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<CreUserPrefs>;
    return {
      gateEnabled: parsed.gateEnabled !== false,
      mode: parsed.mode === 'live' ? 'live' : 'stub',
      triggerUrl: (parsed.triggerUrl || '').trim(),
      workflowId: (parsed.workflowId || '').trim(),
      consumerAddress: (parsed.consumerAddress || '').trim(),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setCreUserPrefs(prefs: Partial<CreUserPrefs>): CreUserPrefs {
  const cur = getCreUserPrefs();
  const next: CreUserPrefs = {
    gateEnabled: prefs.gateEnabled ?? cur.gateEnabled,
    mode: prefs.mode === 'live' || prefs.mode === 'stub' ? prefs.mode : cur.mode,
    triggerUrl: (prefs.triggerUrl ?? cur.triggerUrl).trim(),
    workflowId: (prefs.workflowId ?? cur.workflowId).trim(),
    consumerAddress: (prefs.consumerAddress ?? cur.consumerAddress).trim(),
  };
  try {
    localStorage.setItem(CRE_KEYS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  notifyCrePrefsChanged();
  return next;
}

const DEV_CRE_TRIGGER_FALLBACK = 'http://localhost:3001/cre/audit';

export function getPlatformCreTriggerUrl(): string {
  return (import.meta.env.VITE_CRE_TRIGGER_URL as string | undefined)?.trim() || '';
}

export function getPlatformCreWorkflowId(): string {
  return (import.meta.env.VITE_CRE_WORKFLOW_ID as string | undefined)?.trim() || '';
}

export function getPlatformCreConsumerAddress(): string {
  return (import.meta.env.VITE_CRE_CONSUMER_ADDRESS as string | undefined)?.trim() || '';
}

/** Optional shared secret for POST /cre/audit (must match server CRE_AUDIT_TOKEN). */
export function getCreAuditToken(): string {
  return (import.meta.env.VITE_CRE_AUDIT_TOKEN as string | undefined)?.trim() || '';
}

/**
 * Effective trigger URL for fetch.
 * Prefs → platform env → DEV-only localhost. Production never invents localhost.
 */
export function getCreTriggerUrl(): string {
  const prefs = getCreUserPrefs();
  const explicit = prefs.triggerUrl || getPlatformCreTriggerUrl();
  if (explicit) return explicit;
  if (import.meta.env.DEV) return DEV_CRE_TRIGGER_FALLBACK;
  return '';
}

export function getCreWorkflowId(): string {
  const prefs = getCreUserPrefs();
  return prefs.workflowId || getPlatformCreWorkflowId();
}

export function getCreConsumerAddress(): string {
  const prefs = getCreUserPrefs();
  return prefs.consumerAddress || getPlatformCreConsumerAddress();
}

export function isCreGateEnabled(): boolean {
  return getCreUserPrefs().gateEnabled;
}

/**
 * True when prefs or VITE_CRE_TRIGGER_URL is set.
 * In DEV, the localhost compiler fallback also counts so local `npm run compiler` works.
 */
export function isCreConfigured(): boolean {
  const prefs = getCreUserPrefs();
  if (prefs.triggerUrl || getPlatformCreTriggerUrl()) return true;
  return Boolean(import.meta.env.DEV);
}

export const CRE_CONSUMER_ABI = [
  'function latestVerdictCode() view returns (uint8)',
  'function latestRiskMask() view returns (uint8)',
  'function latestSourceHash() view returns (bytes32)',
  'function latestRecordedAt() view returns (uint256)',
  'function recordVerdict(uint8 verdictCode, uint8 riskMask, bytes32 sourceHash, uint64 chainSelector)',
  'event VerdictReceived(uint8 verdictCode, uint8 riskMask, bytes32 indexed sourceHash, uint64 chainSelector, address indexed reporter)',
] as const;
