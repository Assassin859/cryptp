/**
 * Restores the `kzg` export removed in @ethereumjs/util 9.1+ so @ethereumjs/tx
 * EIP-4844 code can bundle. Blob txs are not used in the in-browser simulator.
 */
function kzgNotLoaded(): never {
  throw new Error('KZG library not loaded');
}

export let kzg: {
  loadTrustedSetup: (...args: unknown[]) => void;
  blobToKzgCommitment: (...args: unknown[]) => unknown;
  computeBlobKzgProof: (...args: unknown[]) => unknown;
  verifyKzgProof: (...args: unknown[]) => unknown;
  verifyBlobKzgProofBatch: (...args: unknown[]) => boolean;
} = {
  loadTrustedSetup: kzgNotLoaded,
  blobToKzgCommitment: kzgNotLoaded,
  computeBlobKzgProof: kzgNotLoaded,
  verifyKzgProof: kzgNotLoaded,
  verifyBlobKzgProofBatch: () => false,
};

export function initKZG(kzgLib: typeof kzg, _trustedSetupPath?: string): void {
  kzg = kzgLib;
  kzg.loadTrustedSetup(_trustedSetupPath);
}
