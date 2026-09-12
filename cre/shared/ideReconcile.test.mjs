/**
 * Unit tests: IDE↔CRE reconcile + score display helpers.
 * Run via: npm run cre:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileAllowWithIdeHighs, formatSafetyScorePercent } from './ideReconcile.mjs';
import { evaluateDeployPolicy } from './deployPolicy.mjs';

const CLEAN =
  'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }';

describe('ideReconcile', () => {
  it('SimpleStorage stays ALLOW when no IDE High findings', () => {
    const policy = evaluateDeployPolicy({ sourceCode: CLEAN });
    assert.equal(policy.verdict, 'ALLOW');
    const gateable = {
      verdict: 'ALLOW',
      gateable: true,
      reason: policy.reason,
    };
    const out = reconcileAllowWithIdeHighs(gateable, 0);
    assert.equal(out.verdict, 'ALLOW');
    assert.equal(out.ideReconciled, undefined);
  });

  it('ALLOW + IDE High → MANUAL_REVIEW (not gateable ALLOW)', () => {
    const out = reconcileAllowWithIdeHighs(
      { verdict: 'ALLOW', gateable: true, reason: 'ok' },
      2
    );
    assert.equal(out.verdict, 'MANUAL_REVIEW');
    assert.equal(out.ideReconciled, true);
    assert.match(out.reason, /IDE Problem Audit/i);
  });

  it('empty unscored file never shows -1%', () => {
    assert.equal(formatSafetyScorePercent(-1), 'N/A');
    assert.equal(formatSafetyScorePercent(null), 'N/A');
    assert.equal(formatSafetyScorePercent(92), '92%');
  });
});
