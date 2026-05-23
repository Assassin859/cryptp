/**
 * Solidity Compiler Version Registry
 * ---------------------------------
 * Maps stable version tags to their official soljson binary URLs on binaries.soliditylang.org.
 * Only stable releases are tracked here. 
 * Note: Commit hashes are required for the full script URL.
 */

export interface SolcVersion {
  label: string;
  url: string;
  isStable: boolean;
}

export const COMPILER_VERSIONS: Record<string, SolcVersion> = {
  '0.8.28': {
    label: '0.8.28+commit.7890f14d',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.8.28+commit.7890f14d.js',
    isStable: true
  },
  '0.8.24': {
    label: '0.8.24+commit.e11b9ed9',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.8.24+commit.e11b9ed9.js',
    isStable: true
  },
  '0.8.20': {
    label: '0.8.20+commit.a1b79de6',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js',
    isStable: true
  },
  '0.8.19': {
    label: '0.8.19+commit.7dd6d404',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js',
    isStable: true
  },
  '0.8.7': {
    label: '0.8.7+commit.e28d00a7',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.8.7+commit.e28d00a7.js',
    isStable: true
  },
  '0.7.6': {
    label: '0.7.6+commit.7338295f',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.7.6+commit.7338295f.js',
    isStable: true
  },
  '0.6.12': {
    label: '0.6.12+commit.27d51765',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.6.12+commit.27d51765.js',
    isStable: true
  },
  '0.5.17': {
    label: '0.5.17+commit.d19bba13',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.5.17+commit.d19bba13.js',
    isStable: true
  },
  '0.4.26': {
    label: '0.4.26+commit.4563c3fc',
    url: 'https://binaries.soliditylang.org/bin/soljson-v0.4.26+commit.4563c3fc.js',
    isStable: true
  }
};

export const DEFAULT_VERSION = '0.8.20';

/**
 * Detects the pragma version from source code.
 * Returns the key from COMPILER_VERSIONS if found, otherwise null.
 */
export const detectPragmaVersion = (source: string): string | null => {
  const match = source.match(/pragma\s+solidity\s+[\^><=]*\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  if (match && match[1]) {
    const version = match[1];
    // Check if we have an exact or close match in our registry
    if (COMPILER_VERSIONS[version]) return version;
    
    // If it's a 0.8.x version we don't have, fallback to a stable 0.8.x
    if (version.startsWith('0.8.')) return '0.8.28';
  }
  return null;
};
