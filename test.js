import { scanContract } from './src/utils/securityScanner.js';

import * as parser from '@solidity-parser/parser';

console.log("\n=============================================");
console.log("🛡️ SECURITY ENGINE END-TO-END VERIFICATION");
console.log("=============================================\n");

const scenarios = [
  {
    name: "Scenario 1: Clean Contract (Working as Intended)",
    code: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
contract CleanVault {
    uint256 private _balance;
    function deposit(uint256 amount) public { _balance += amount; }
}
`
  },
  {
    name: "Scenario 2: Vulnerable Contract (High & Medium Risk)",
    code: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract VulnerableVault {
    uint256 private _balance;
    function withdrawAll() public {
        require(tx.origin == msg.sender, "No contracts allowed");
        msg.sender.call{value: address(this).balance}("");
        _balance = 0;
    }
    function destroy() public { selfdestruct(payable(msg.sender)); }
}
`
  },
  {
    name: "Scenario 3: Syntax Error / Broken Code (Score N/A test case)",
    code: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
contract BrokenVault {
    uint256 private _balance;
    function bug() public { _balance += 10
`
  }
];

function runTests() {
  scenarios.forEach((scenario, index) => {
    console.log(`\n\n--- [TEST ${index + 1}] ${scenario.name} ---`);
    console.log("Attempting to parse and scan Solidity Source Code...");

    try {
      // Step 1: Simulate the compilation/parsing phase
      parser.parse(scenario.code, { loc: true });
      console.log("✅ Compilation / Parsing Successful. Valid AST generated.");

      // Step 2: Run the Security Engine (AST Traversal)
      const report = scanContract(scenario.code);
      
      console.log("\n➡️ SECURITY REPORT GENERATED:");
      console.log(`   Final Security Score: ${report.score} / 100`);
      console.log(`   Threat Summary: ${report.summary.high} High, ${report.summary.medium} Medium, ${report.summary.low} Low.`);
      
      if (report.findings.length > 0) {
        console.log("\n   Findings Detail:");
        report.findings.forEach((f, i) => {
          console.log(`     [${i + 1}] [${f.severity.toUpperCase()}] ${f.title}`);
          console.log(`         - Rule ID: ${f.id}`);
          console.log(`         - Fix: ${f.recommendation}`);
        });
      } else {
        console.log("\n   🎉 Outstanding! Zero security risks detected.");
      }

    } catch (e) {
      // Step 3: Handle the Compilation Error (Score N/A)
      console.log("❌ Compilation / Parsing FAILED.");
      console.log(`   Compiler Output: Cannot read AST -> ${e.message}`);
      console.log("\n🚨 IDE DEFENSE MECHANISM TRIGGERED:");
      console.log("   Result: Score set to N/A. Security scanning halted.");
      console.log("   UI Prompt Triggered: \"Security auditing requires a valid compilation step. Please fix the compiler errors in the 'Deployment' tab first.\"");
    }
  });

  console.log("\n=============================================");
  console.log("🏁 SECURE ENGINE TESTING COMPLETE");
  console.log("=============================================\n");
}

runTests();
