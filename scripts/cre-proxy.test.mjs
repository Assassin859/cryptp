/**
 * Unit tests: cre-proxy hash binding + stub gate.
 * Run: node --test scripts/cre-proxy.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  assertSourceHashBinding,
  evaluateDeployPolicyStub,
  handleCreAuditRequest,
} from '../cre-proxy.mjs';

const CLEAN =
  'pragma solidity 0.8.20; contract SimpleStorage { uint256 private _value; function setValue(uint256 x) public { _value = x; } }';
const BAD = 'contract Bad { function x() public { selfdestruct(payable(msg.sender)); } }';

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('assertSourceHashBinding', () => {
  it('accepts matching hash (with or without 0x)', () => {
    const h = sha256Hex(CLEAN);
    assert.equal(assertSourceHashBinding(CLEAN, h), h);
    assert.equal(assertSourceHashBinding(CLEAN, `0x${h}`), h);
  });

  it('rejects missing hash', () => {
    assert.throws(
      () => assertSourceHashBinding(CLEAN, ''),
      (e) => e.statusCode === 400 && /Missing sourceHash/i.test(e.message)
    );
  });

  it('rejects mismatched hash', () => {
    assert.throws(
      () => assertSourceHashBinding(CLEAN, 'deadbeef'),
      (e) => e.statusCode === 400 && /does not match/i.test(e.message)
    );
  });
});

describe('handleCreAuditRequest stub', () => {
  it('ALLOW when hash matches clean source', async () => {
    const h = sha256Hex(CLEAN);
    const r = await handleCreAuditRequest({
      sourceCode: CLEAN,
      sourceHash: h,
      mode: 'stub',
    });
    assert.equal(r.verdict, 'ALLOW');
    assert.equal(r.gateable, true);
    assert.equal(r.mode, 'stub');
  });

  it('DENY when hash matches risky source', async () => {
    const h = sha256Hex(BAD);
    const r = await handleCreAuditRequest({
      sourceCode: BAD,
      sourceHash: h,
      mode: 'stub',
    });
    assert.equal(r.verdict, 'DENY');
  });

  it('rejects audit when hash does not bind', async () => {
    await assert.rejects(
      () =>
        handleCreAuditRequest({
          sourceCode: CLEAN,
          sourceHash: sha256Hex(BAD),
          mode: 'stub',
        }),
      (e) => e.statusCode === 400
    );
  });
});

describe('evaluateDeployPolicyStub', () => {
  it('maps policy verdict codes', () => {
    const allow = evaluateDeployPolicyStub({ sourceCode: CLEAN, sourceHash: 'x' });
    const deny = evaluateDeployPolicyStub({ sourceCode: BAD, sourceHash: 'x' });
    assert.equal(allow.verdictCode, 1);
    assert.equal(deny.verdictCode, 2);
  });
});
