/**
 * Staging evidence runner (no CRE CLI required).
 * Usage: node cre/evidence/run-demo.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Re-implement minimal evaluate for evidence without TS loader
function evaluate(sourceCode) {
  const s = sourceCode.toLowerCase();
  let deny = false;
  if (/selfdestruct|delegatecall/.test(s)) deny = true;
  if (/\.call\s*\{|\.call\(/.test(s)) deny = true;
  return {
    verdict: deny ? 'DENY' : 'ALLOW',
    verdictCode: deny ? 2 : 1,
    riskMask: deny ? 2 : 0,
    reason: deny
      ? 'Local staging policy flagged risk patterns — live deploy blocked'
      : 'Local staging policy found no flagged patterns (not a TEE/CRE verdict)',
    confidential: false,
    mode: 'stub-staging',
  };
}

const clean = evaluate(
  'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }'
);
const bad = evaluate('contract Bad { function x() public { selfdestruct(payable(msg.sender)); } }');

const report = {
  generatedAt: new Date().toISOString(),
  note: 'Local staging evidence for Aethon CRE audit policy (proxy stub today; handlerInTee target when CRE registered). Replace with cre workflow simulate transcript when CLI is available.',
  cases: [
    { name: 'SimpleStorage', ...clean },
    { name: 'selfdestruct', ...bad },
  ],
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outJson = join(__dirname, 'simulate-stub-result.json');
writeFileSync(outJson, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('Wrote', outJson);
