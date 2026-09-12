/**
 * Aethon localStorage helpers — prefer `aethon-*` keys with `cryptp-*` read fallback.
 */

export function aethonKey(suffix: string): string {
  const s = suffix.startsWith('aethon-') || suffix.startsWith('cryptp-')
    ? suffix.replace(/^cryptp-/, 'aethon-')
    : `aethon-${suffix}`;
  return s;
}

export function legacyCryptpKey(aethonOrSuffix: string): string {
  if (aethonOrSuffix.startsWith('aethon-')) {
    return `cryptp-${aethonOrSuffix.slice('aethon-'.length)}`;
  }
  if (aethonOrSuffix.startsWith('cryptp-')) return aethonOrSuffix;
  return `cryptp-${aethonOrSuffix}`;
}

/** Read new key first, then legacy cryptp-*; optionally migrate value to aethon-*. */
export function lsGet(key: string, migrate = true): string | null {
  if (typeof localStorage === 'undefined') return null;
  const primary = aethonKey(key);
  const legacy = legacyCryptpKey(primary);
  const v = localStorage.getItem(primary) ?? localStorage.getItem(legacy);
  if (migrate && v != null && localStorage.getItem(primary) == null && localStorage.getItem(legacy) != null) {
    try {
      localStorage.setItem(primary, v);
    } catch {
      /* ignore quota */
    }
  }
  return v;
}

export function lsSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(aethonKey(key), value);
}

export function lsRemove(key: string): void {
  if (typeof localStorage === 'undefined') return;
  const primary = aethonKey(key);
  localStorage.removeItem(primary);
  localStorage.removeItem(legacyCryptpKey(primary));
}

export function sessionGet(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const primary = aethonKey(key);
  return sessionStorage.getItem(primary) ?? sessionStorage.getItem(legacyCryptpKey(primary));
}

export function sessionSet(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(aethonKey(key), value);
}

/** True if key should survive idle logout (AI/RPC/Graph/CRE prefs). */
export function isPreservedStorageKey(k: string): boolean {
  return (
    (k.startsWith('aethon-') || k.startsWith('cryptp-')) &&
    (k.includes('-keys') || k.includes('graph-keys') || k.includes('cre-keys'))
  );
}
