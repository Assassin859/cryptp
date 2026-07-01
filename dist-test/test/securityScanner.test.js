import { expect } from "chai";
import { scanContract } from "../src/utils/securityScanner.js";
describe("Security Scanner AST Detector Suite", function () {
    it("SecureToken: Should score 100% and have 0 findings", function () {
        const code = `
      // SPDX-License-Identifier: MIT
      pragma solidity 0.8.20;
      
      interface IERC20 {
          function transfer(address to, uint256 value) external returns (bool);
      }

      contract SecureToken {
          string public name = "SecureToken";
          string public symbol = "SEC";
          uint8 public decimals = 18;
          uint256 public totalSupply = 1000000 * 10**18;
          
          mapping(address => uint256) public balanceOf;
          
          event Transfer(address indexed from, address indexed to, uint256 value);
          
          constructor() {
              balanceOf[msg.sender] = totalSupply;
              emit Transfer(address(0), msg.sender, totalSupply);
          }
          
          function transfer(address to, uint256 value) public returns (bool) {
              require(balanceOf[msg.sender] >= value, "Insufficient balance");
              balanceOf[msg.sender] -= value;
              balanceOf[to] += value;
              emit Transfer(msg.sender, to, value);
              return true;
          }
      }
    `;
        const report = scanContract(code);
        expect(report.score).to.equal(100);
        expect(report.findings.length).to.equal(0);
    });
    it("GuardedVault: Should skip reentrancy due to nonReentrant modifier", function () {
        const code = `
      // SPDX-License-Identifier: MIT
      pragma solidity 0.8.20;

      abstract contract ReentrancyGuard {
          uint256 private constant _NOT_ENTERED = 1;
          uint256 private constant _ENTERED = 2;
          uint256 private _status;
          
          constructor() {
              _status = _NOT_ENTERED;
          }
          
          modifier nonReentrant() {
              require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
              _status = _ENTERED;
              _;
              _status = _NOT_ENTERED;
          }
      }

      contract GuardedVault is ReentrancyGuard {
          mapping(address => uint256) public balances;
          event Withdrawn(address indexed user, uint256 amount);
          
          function withdraw() external nonReentrant {
              uint256 amount = balances[msg.sender];
              require(amount > 0, "No balance");
              (bool ok, ) = msg.sender.call{value: amount}("");
              require(ok, "Transfer failed");
              balances[msg.sender] = 0;
              emit Withdrawn(msg.sender, amount);
          }
      }
    `;
        const report = scanContract(code);
        // Should NOT trigger reentrancy (S001) because of nonReentrant guard modifier
        const hasReentrancy = report.findings.some(f => f.id === "S001");
        expect(hasReentrancy).to.be.false;
    });
    it("MediumRiskVault: Should flag Reentrancy (Critical), Timestamp, blockhash, Centralization Risk, and compute correct score", function () {
        const code = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;

      contract MediumRiskVault {
          address public owner;
          mapping(address => uint256) public balances;

          modifier onlyOwner() {
              require(msg.sender == owner, "Not owner");
              _;
          }

          constructor() {
              owner = msg.sender;
          }

          function deposit() external payable {
              balances[msg.sender] += msg.value;
          }

          function withdraw() external {
              uint256 bal = balances[msg.sender];
              require(bal > 0, "No balance");
              (bool sent, ) = msg.sender.call{value: bal}("");
              require(sent, "Failed to send Ether");
              balances[msg.sender] = 0; // State change after external call -> Reentrancy!
          }

          function getTimestamp() external view returns (uint256) {
              return block.timestamp; // Timestamp dependence
          }

          function randomNumber() external view returns (bytes32) {
              return blockhash(block.number - 1); // Insecure Randomness
          }

          function emergencyDrain() external onlyOwner {
              payable(owner).transfer(address(this).balance); // Centralized Risk (onlyOwner + transfers balance)
          }
      }
    `;
        const report = scanContract(code);
        const findingIds = report.findings.map(f => f.id);
        // Verify findings are present
        expect(findingIds).to.include("S001"); // Reentrancy
        expect(findingIds).to.include("S003"); // Insecure Randomness (blockhash)
        expect(findingIds).to.include("S007"); // Timestamp dependence
        expect(findingIds).to.include("S013"); // Centralization Risk
        expect(findingIds).to.include("S004"); // Floating Pragma
        // Verify reentrancy is Critical in summary
        expect(report.summary.critical).to.equal(1);
        // Safety score should be capped or correctly calculated
        expect(report.score).to.be.lessThanOrEqual(20); // Cap of 20% due to Critical reentrancy
    });
    it("InsecureBank: Should flag Missing Access Control, Untrusted Delegatecall, Calls in Loop, and score 0%", function () {
        const code = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.0;

      contract InsecureBank {
          address public owner;
          mapping(address => uint256) public balances;

          constructor() {
              owner = msg.sender;
          }

          // Missing access control (public function, no modifier or require checks)
          function transferOwnership(address newOwner) public {
              owner = newOwner;
          }

          function withdraw() public {
              uint256 bal = balances[msg.sender];
              (bool sent, ) = msg.sender.call{value: bal}("");
              require(sent);
              balances[msg.sender] = 0; // Reentrancy
          }

          // Unbounded loop over calldata parameter
          function airdrop(address[] calldata recipients, uint256 amount) external {
              for (uint256 i = 0; i < recipients.length; i++) {
                  balances[recipients[i]] += amount;
              }
          }

          // Untrusted delegatecall
          function riskyDelegate(address _target, bytes calldata _data) external {
              (bool ok, ) = _target.delegatecall(_data);
              require(ok);
          }

          // Call in loop (DoS risk)
          function payoutAll(address[] calldata recipients) external {
              for (uint256 i = 0; i < recipients.length; i++) {
                  (bool sent, ) = recipients[i].call{value: 1 ether}("");
                  require(sent);
              }
          }
      }
    `;
        const report = scanContract(code);
        const findingIds = report.findings.map(f => f.id);
        expect(findingIds).to.include("S001"); // Reentrancy
        expect(findingIds).to.include("S016"); // Missing Access Control
        expect(findingIds).to.include("S006"); // Unbounded Loop
        expect(findingIds).to.include("SWC-112"); // Untrusted delegatecall
        expect(findingIds).to.include("S017"); // Call in loop
        expect(report.score).to.equal(0);
    });
});
