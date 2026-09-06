/**
 * Shared constants for CryptP ↔ The Graph indexing (SimpleStorage kind).
 * User Studio prefs live in localStorage key `cryptp-graph-keys` (survives logout).
 */
import { id } from 'ethers';

/** keccak256("SimpleStorage") — matches CryptPIndexRegistry.KIND_SIMPLE_STORAGE */
export const KIND_SIMPLE_STORAGE = id('SimpleStorage');

export const REGISTRY_ABI = [
  'function register(address contractAddress, bytes32 kind) external',
  'function registeredKind(address) view returns (bytes32)',
  'function KIND_SIMPLE_STORAGE() view returns (bytes32)',
  'event ContractRegistered(address indexed contractAddress, address indexed registrant, bytes32 indexed kind)',
] as const;

/** Logout-safe blob (matches Auth/App `includes('-keys')` preserve rule). */
export const GRAPH_KEYS_STORAGE = 'cryptp-graph-keys';

const LEGACY_MODE = 'cryptp-graph-mode';
const LEGACY_ENDPOINT = 'cryptp-graph-endpoint';
const LEGACY_REGISTRY = 'cryptp-graph-registry';

export type GraphSourceMode = 'platform' | 'studio';

export interface GraphUserPrefs {
  mode: GraphSourceMode;
  endpoint: string;
  registry: string;
}

const DEFAULT_PREFS: GraphUserPrefs = {
  mode: 'platform',
  endpoint: '',
  registry: '',
};

function notifyGraphPrefsChanged(): void {
  try {
    window.dispatchEvent(new Event('cryptp-graph-prefs'));
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
    };
    localStorage.setItem(GRAPH_KEYS_STORAGE, JSON.stringify(prefs));
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
    const raw = localStorage.getItem(GRAPH_KEYS_STORAGE);
    if (!raw) {
      const migrated = migrateLegacyPrefs();
      return migrated ?? { ...DEFAULT_PREFS };
    }
    const parsed = JSON.parse(raw) as Partial<GraphUserPrefs>;
    return {
      mode: parsed.mode === 'studio' ? 'studio' : 'platform',
      endpoint: (parsed.endpoint || '').trim(),
      registry: (parsed.registry || '').trim(),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setGraphUserPrefs(prefs: Partial<GraphUserPrefs>): GraphUserPrefs {
  const next: GraphUserPrefs = {
    ...getGraphUserPrefs(),
    ...prefs,
    endpoint: (prefs.endpoint ?? getGraphUserPrefs().endpoint).trim(),
    registry: (prefs.registry ?? getGraphUserPrefs().registry).trim(),
    mode: prefs.mode === 'studio' || prefs.mode === 'platform'
      ? prefs.mode
      : getGraphUserPrefs().mode,
  };
  try {
    localStorage.setItem(GRAPH_KEYS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  notifyGraphPrefsChanged();
  return next;
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
