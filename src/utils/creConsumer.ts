/**
 * Staging helper: write CRE audit verdict to AuditFirewallConsumer on Sepolia.
 * Production path should use Keystone writeReport — this is reporter/owner only.
 */
import { Contract, type Signer } from 'ethers';
import { CRE_CONSUMER_ABI } from './creConstants';

export async function recordCreVerdictOnchain(opts: {
  signer: Signer;
  consumerAddress: string;
  verdictCode: number;
  riskMask: number;
  sourceHash: string;
  chainSelector?: number;
}): Promise<{ txHash: string }> {
  const hashHex = opts.sourceHash.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hashHex)) {
    throw new Error('sourceHash must be a 32-byte hex digest');
  }
  if (opts.verdictCode < 1 || opts.verdictCode > 3) {
    throw new Error('Invalid verdictCode (expected 1–3)');
  }

  const consumer = new Contract(opts.consumerAddress, CRE_CONSUMER_ABI, opts.signer);
  const tx = await consumer.recordVerdict(
    opts.verdictCode,
    opts.riskMask,
    `0x${hashHex}`,
    opts.chainSelector ?? 0
  );
  const receipt = await tx.wait();
  return { txHash: receipt?.hash || tx.hash };
}
