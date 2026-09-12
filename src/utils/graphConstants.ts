/**
 * Shared constants for Aethon ↔ The Graph indexing.
 * User Studio prefs: `aethon-graph-keys` (legacy `cryptp-graph-keys` still read).
 */
import { id } from 'ethers';
import { lsGet, lsSet, lsRemove } from './aethonStorage';
import { abiLooksLikeCounterHook } from './hookMiner';

/** keccak256("SimpleStorage") — matches CryptPIndexRegistry.KIND_SIMPLE_STORAGE */
export const KIND_SIMPLE_STORAGE = id('SimpleStorage');
/** keccak256("CounterHook") — Continuity Uniswap hook */
export const KIND_COUNTER_HOOK = id('CounterHook');
/** keccak256("AuditFirewallConsumer") — CRE verdict consumer */
export const KIND_AUDIT_FIREWALL = id('AuditFirewallConsumer');

export const REGISTRY_ABI = [
  'function register(address contractAddress, bytes32 kind) external',
  'function registeredKind(address) view returns (bytes32)',
  'function KIND_SIMPLE_STORAGE() view returns (bytes32)',
  'event ContractRegistered(address indexed contractAddress, address indexed registrant, bytes32 indexed kind)',
] as const;

/** Logout-safe blob (matches Auth/App preserve rule for *-keys*). */
export const GRAPH_KEYS_STORAGE = 'aethon-graph-keys';
export const GRAPH_PREFS_EVENT = 'aethon-graph-prefs';

const LEGACY_MODE = 'cryptp-graph-mode';
const LEGACY_ENDPOINT = 'cryptp-graph-endpoint';
const LEGACY_REGISTRY = 'cryptp-graph-registry';

export type GraphSourceMode = 'platform' | 'studio';

export interface GraphUserPrefs {
  mode: GraphSourceMode;
  endpoint: string;
  registry: string;
  /** When true, Sepolia deploys auto-register without a confirm modal. */
  autoRegister: boolean;
}

const DEFAULT_PREFS: GraphUserPrefs = {
  mode: 'platform',
  endpoint: '',
  registry: '',
  autoRegister: true,
};

function notifyGraphPrefsChanged(): void {
  try {
    window.dispatchEvent(new Event(GRAPH_PREFS_EVENT));
    window.dispatchEvent(new Event('cryptp-graph-prefs')); // legacy listeners
  } catch {
    /* ignore */
  }
}

function migrateLegacyPrefs(): GraphUserPrefs | null {
  try {
    const modeRaw = localStorage.getItem(LEGACY_MODE);
    const endpoint = (localStorage.getItem(LEGACY_ENDPOINT) || '').trim();
    const registry = (localStorage.getItem(LEGACY_REGISTRY) || '').trim();
    if (!modeRaw && !endpoint && !registry) return null;

    const prefs: GraphUserPrefs = {
      mode: modeRaw === 'studio' ? 'studio' : 'platform',
      endpoint,
      registry,
      autoRegister: true,
    };
    lsSet(GRAPH_KEYS_STORAGE, JSON.stringify(prefs));
    localStorage.removeItem(LEGACY_MODE);
    localStorage.removeItem(LEGACY_ENDPOINT);
    localStorage.removeItem(LEGACY_REGISTRY);
    return prefs;
  } catch {
    return null;
  }
}

export function getGraphUserPrefs(): GraphUserPrefs {
  try {
    const raw = lsGet(GRAPH_KEYS_STORAGE);
    if (!raw) {
      const migrated = migrateLegacyPrefs();
      return migrated ?? { ...DEFAULT_PREFS };
    }
    const parsed = JSON.parse(raw) as Partial<GraphUserPrefs>;
    return {
      mode: parsed.mode === 'studio' ? 'studio' : 'platform',
      endpoint: (parsed.endpoint || '').trim(),
      registry: (parsed.registry || '').trim(),
      autoRegister: parsed.autoRegister !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setGraphUserPrefs(prefs: Partial<GraphUserPrefs>): GraphUserPrefs {
  const cur = getGraphUserPrefs();
  const next: GraphUserPrefs = {
    ...cur,
    ...prefs,
    endpoint: (prefs.endpoint ?? cur.endpoint).trim(),
    registry: (prefs.registry ?? cur.registry).trim(),
    mode: prefs.mode === 'studio' || prefs.mode === 'platform' ? prefs.mode : cur.mode,
    autoRegister: prefs.autoRegister !== undefined ? prefs.autoRegister : cur.autoRegister,
  };
  try {
    lsSet(GRAPH_KEYS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  notifyGraphPrefsChanged();
  return next;
}

export function clearGraphUserPrefsStorage(): void {
  lsRemove(GRAPH_KEYS_STORAGE);
  notifyGraphPrefsChanged();
}

export function getGraphSourceMode(): GraphSourceMode {
  return getGraphUserPrefs().mode;
}

export function setGraphSourceMode(mode: GraphSourceMode): void {
  setGraphUserPrefs({ mode });
}

/** Platform env endpoint (no user override). */
export function getPlatformGraphEndpoint(): string {
  return (import.meta.env.VITE_GRAPH_ENDPOINT as string | undefined)?.trim() || '';
}

/** Platform env registry (no user override). */
export function getPlatformGraphRegistryAddress(): string {
  return (import.meta.env.VITE_GRAPH_REGISTRY_ADDRESS as string | undefined)?.trim() || '';
}

export function getCustomGraphEndpoint(): string {
  return getGraphUserPrefs().endpoint;
}

export function getCustomGraphRegistryAddress(): string {
  return getGraphUserPrefs().registry;
}

export function setCustomGraphEndpoint(url: string): void {
  setGraphUserPrefs({ endpoint: url });
}

export function setCustomGraphRegistryAddress(address: string): void {
  setGraphUserPrefs({ registry: address });
}

/** Active GraphQL endpoint: Studio override when mode=studio, else platform env. */
export function getGraphEndpoint(): string {
  if (getGraphSourceMode() === 'studio') {
    return getCustomGraphEndpoint();
  }
  return getPlatformGraphEndpoint();
}

/** Active registry for Register tx. */
export function getGraphRegistryAddress(): string {
  if (getGraphSourceMode() === 'studio') {
    return getCustomGraphRegistryAddress() || getPlatformGraphRegistryAddress();
  }
  return getPlatformGraphRegistryAddress();
}

/** True when ABI includes SimpleStorage-style ValueChanged(address,uint256). */
export function abiLooksLikeSimpleStorage(abi: unknown): boolean {
  if (!Array.isArray(abi)) return false;
  return abi.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const rec = item as { type?: string; name?: string; inputs?: { type: string }[] };
    if (rec.type !== 'event' || rec.name !== 'ValueChanged') return false;
    const inputs = rec.inputs ?? [];
    return (
      inputs.length === 2 &&
      inputs[0]?.type === 'address' &&
      inputs[1]?.type === 'uint256'
    );
  });
}

export function abiLooksLikeAuditFirewall(abi: unknown): boolean {
  if (!Array.isArray(abi)) return false;
  const names = new Set(
    abi
      .filter((x): x is { type?: string; name?: string } => !!x && typeof x === 'object')
      .filter((x) => x.type === 'function' || x.type === 'event')
      .map((x) => x.name || '')
  );
  return names.has('recordVerdict') && names.has('VerdictReceived');
}

/** Kind bytes32 for registry.register, or null if ABI is not Continuity-indexable. */
export function resolveRegisterKind(abi: unknown): string | null {
  if (abiLooksLikeSimpleStorage(abi)) return KIND_SIMPLE_STORAGE;
  if (abiLooksLikeCounterHook(abi)) return KIND_COUNTER_HOOK;
  if (abiLooksLikeAuditFirewall(abi)) return KIND_AUDIT_FIREWALL;
  return null;
}

export function abiLooksLikeGraphIndexable(abi: unknown): boolean {
  return resolveRegisterKind(abi) != null;
}
