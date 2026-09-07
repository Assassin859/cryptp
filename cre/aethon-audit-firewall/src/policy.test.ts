import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDeployPolicy, scanSourceHeuristics } from './policy.ts';

describe('scanSourceHeuristics', () => {
  it('flags selfdestruct as privilege escalation', () => {
    const flags = scanSourceHeuristics('function kill() public { selfdestruct(payable(owner)); }');
    assert.equal(flags.privilegeEscalation, true);
  });

  it('clean storage is low risk', () => {
    const flags = scanSourceHeuristics(
      'pragma solidity 0.8.20; contract S { uint256 v; function set(uint256 x) public { v = x; } }'
    );
    assert.equal(flags.privilegeEscalation, false);
    assert.equal(flags.externalCallRisk, false);
  });
});

describe('evaluateDeployPolicy', () => {
  it('ALLOW for clean SimpleStorage-like source', () => {
    const r = evaluateDeployPolicy({
      sourceCode:
        'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }',
      sourceHash: 'abc',
    });
    assert.equal(r.verdict, 'ALLOW');
  });

  it('DENY for selfdestruct', () => {
    const r = evaluateDeployPolicy({
      sourceCode: 'contract Bad { function x() public { selfdestruct(payable(msg.sender)); } }',
    });
    assert.equal(r.verdict, 'DENY');
  });
});
