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

  it('does not flag Ownable ERC20 that only mentions fee in a comment/param', () => {
    const ownableFee =
      'pragma solidity 0.8.20; contract T is Ownable { // protocol fee recipient\n' +
      'function transfer(address to, uint256 amount) public returns (bool) { return true; }\n' +
      'function setFeeRecipient(address fee) public onlyOwner {}\n}';
    const f = scanSourceHeuristics(ownableFee);
    assert.equal(f.obfuscatedTax, false);
  });

  it('flags classic setTax / excludeFromFee tax-token patterns', () => {
    const taxToken =
      'contract Tax is Ownable { uint256 public taxFee; function setTax(uint256 t) public onlyOwner { taxFee = t; }\n' +
      'function excludeFromFee(address a) public onlyOwner {}\n' +
      'function transfer(address to, uint256 amount) public returns (bool) { return true; } }';
    const f = scanSourceHeuristics(taxToken);
    assert.equal(f.obfuscatedTax, true);
  });
});

describe('evaluateDeployPolicy', () => {
  it('ALLOW for clean SimpleStorage-like source', () => {
    const r = evaluateDeployPolicy({ sourceCode: CLEAN });
    assert.equal(r.verdict, 'ALLOW');
    assert.match(r.reason, /Local staging|no flagged/i);
  });

  it('ALLOW for Ownable transfer with fee recipient setter (not a tax token)', () => {
    const src =
      'contract T is Ownable { function transfer(address to, uint256 amount) public returns (bool) { return true; }\n' +
      'function setFeeRecipient(address fee) public onlyOwner {} }';
    const r = evaluateDeployPolicy({ sourceCode: src });
    assert.equal(r.verdict, 'ALLOW');
  });

  it('DENY for selfdestruct', () => {
    const r = evaluateDeployPolicy({ sourceCode: BAD });
    assert.equal(r.verdict, 'DENY');
  });

  it('DENY for setTax + excludeFromFee Ownable token', () => {
    const taxToken =
      'contract Tax is Ownable { uint256 public taxFee; function setTax(uint256 t) public onlyOwner { taxFee = t; }\n' +
      'function excludeFromFee(address a) public onlyOwner {}\n' +
      'function transfer(address to, uint256 amount) public returns (bool) { return true; } }';
    const r = evaluateDeployPolicy({ sourceCode: taxToken });
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

  it('MANUAL_REVIEW for .transfer (not gateable ALLOW)', () => {
    const src =
      'pragma solidity 0.8.20; contract Payout { function pay(address payable to) public { to.transfer(1 ether); } }';
    const f = scanSourceHeuristics(src);
    assert.equal(f.externalCallRisk, true);
    const r = evaluateDeployPolicy({ sourceCode: src });
    assert.equal(r.verdict, 'MANUAL_REVIEW');
    assert.notEqual(r.verdict, 'ALLOW');
  });

  it('MANUAL_REVIEW for .send', () => {
    const src =
      'pragma solidity 0.8.20; contract Payout { function pay(address payable to) public { to.send(1 ether); } }';
    const r = evaluateDeployPolicy({ sourceCode: src });
    assert.equal(r.verdict, 'MANUAL_REVIEW');
  });

  it('MANUAL_REVIEW for soft .call alone (not DENY)', () => {
    const src =
      'pragma solidity 0.8.20; contract SafeCei { uint256 public bal; function withdraw(address to) public { bal = 0; (bool ok,) = to.call{value: 1 ether}(""); require(ok); } }';
    const r = evaluateDeployPolicy({ sourceCode: src });
    assert.equal(r.verdict, 'MANUAL_REVIEW');
    assert.notEqual(r.verdict, 'DENY');
  });
});
