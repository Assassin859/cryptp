/**
 * Print the EVM address for CRE_TRIGGER_PRIVATE_KEY (HTTP trigger authorizedKeys).
 *
 *   node scripts/cre-print-trigger-address.mjs
 *
 * Put the printed address into cre/aethon-audit-firewall/config.*.json:
 *   "http_trigger": { "enabled": true, "authorizedKeys": ["0x…"] }
 * Then register the workflow when CRE Deploy Access is enabled.
 */
import { Wallet } from 'ethers';
import { config as loadEnv } from 'dotenv';

loadEnv();

const pk = (process.env.CRE_TRIGGER_PRIVATE_KEY || '').trim();
if (!pk) {
  console.error('Set CRE_TRIGGER_PRIVATE_KEY in .env (same key cre-proxy uses for live JWT).');
  process.exit(1);
}

const wallet = new Wallet(pk.startsWith('0x') ? pk : `0x${pk}`);
console.log('CRE HTTP trigger authorized public key (EVM address):');
console.log(wallet.address);
console.log('\nPaste into config.staging.json / config.production.json:');
console.log(
  JSON.stringify(
    {
      http_trigger: {
        enabled: true,
        authorizedKeys: [
          { type: 'KEY_TYPE_ECDSA_EVM', publicKey: wallet.address },
        ],
      },
    },
    null,
    2
  )
);
console.log('\nThen: cre workflow register ./aethon-audit-firewall --project-root ./ --target=production-settings');
