/**
 * Unit tests: shared deploy policy + cre-proxy hash binding.
 * Run: node --test cre/shared/deployPolicy.test.mjs scripts/cre-proxy.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDeployPolicy,
  scanSourceHeuristics,
} from './deployPolicy.mjs';

const CLEAN =
  'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }';
const BAD = 'contract Bad { function x() public { selfdestruct(payable(msg.sender)); } }';

describe('scanSourceHeuristics', () => {
  it('flags selfdestruct as privilege escalation', () => {
    const f = scanSourceHeuristics(BAD);
    assert.equal(f.privilegeEscalation, true);
  });

  it('clean storage is low risk', () => {
    const f = scanSourceHeuristics(CLEAN);
    assert.equal(f.privilegeEscalation, false);
    assert.equal(f.externalCallRisk, false);
  });
});

describe('evaluateDeployPolicy', () => {
  it('ALLOW for clean SimpleStorage-like source', () => {
    const r = evaluateDeployPolicy({ sourceCode: CLEAN });
    assert.equal(r.verdict, 'ALLOW');
    assert.match(r.reason, /Local staging|no flagged/i);
  });

  it('DENY for selfdestruct', () => {
    const r = evaluateDeployPolicy({ sourceCode: BAD });
    assert.equal(r.verdict, 'DENY');
  });

  it('MANUAL_REVIEW on model disagreement', () => {
    const r = evaluateDeployPolicy({
      sourceCode: CLEAN,
      primaryRecommendation: 'allow',
      secondaryRecommendation: 'review',
    });
    assert.equal(r.verdict, 'MANUAL_REVIEW');
  });
});
