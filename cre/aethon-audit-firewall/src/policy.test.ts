/**
 * Smoke: CRE package resolves generated deployPolicy.
 * Behavioral coverage lives in cre/shared/deployPolicy.test.mjs — edit .mjs only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeployPolicy, scanSourceHeuristics } from './policy.ts';

describe('CRE policy package smoke', () => {
  it('exports evaluateDeployPolicy from synced module', () => {
    const r = evaluateDeployPolicy({
      sourceCode:
        'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }',
    });
    assert.equal(r.verdict, 'ALLOW');
  });

  it('flags selfdestruct', () => {
    const flags = scanSourceHeuristics('function kill() public { selfdestruct(payable(owner)); }');
    assert.equal(flags.privilegeEscalation, true);
  });
});
