import { compileWithHardhat } from '../src/utils/hardhatCompiler.js';
import { scanContract } from '../src/utils/securityScanner.js';

console.log("\n=============================================");
console.log("🛡️ STARTING CRYPTP SECURITY & COMPILER TEST");
console.log("=============================================\n");

const cleanContract = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract CleanVault {
    uint256 private _balance;
    function deposit(uint256 amount) public {
        _balance += amount;
    }
}
`;

const vulnerableContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    uint256 private _balance;
    
    function withdrawAll() public {
        require(tx.origin == msg.sender, "No contracts allowed");
        msg.sender.call{value: address(this).balance}("");
        _balance = 0;
    }

    function destroy() public {
        selfdestruct(payable(msg.sender));
    }
}
`;

const brokenContract = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract BrokenVault {
    uint256 private _balance;
    function bug() public {
        _balance += 10
    // Missing brace and semicolon!
`;

async function runTest(name: string, source: string) {
    console.log(`\n\n--- Testing Scenario: [${name}] ---`);
    console.log("1. Compiling Code...");
    
    // Simulate compilation
    const compileResult = await compileWithHardhat(source);
    
    if (compileResult.success) {
        console.log("✅ Compilation Successful.");
        console.log("2. Running Security Engine on AST...");
        
        const report = scanContract(source);
        
        console.log("\n--- SECRETY REPORT ---");
        console.log(`Score: ${report.score}/100`);
        console.log(`Findings: ${report.findings.length} issue(s) detected.`);
        
        report.findings.forEach((f, i) => {
            console.log(`  [${i + 1}] [${f.severity}] ${f.title}`);
            console.log(`      ${f.description}`);
            console.log(`      Rule ID: ${f.id}`);
        });
        
    } else {
        console.log("❌ Compilation FAILED.");
        console.log("Error Log:");
        compileResult.errors?.forEach(e => {
            console.log(`  [${e.type.toUpperCase()}] ${e.message}`);
        });
        console.log("\n-> Security Engine Skipped: Score N/A (valid AST required).");
    }
}

async function runAll() {
    await runTest("Clean Contract", cleanContract);
    await runTest("Vulnerable Contract", vulnerableContract);
    await runTest("Syntax Error Contract", brokenContract);
    console.log("\n=============================================");
    console.log("✅ TESTING COMPLETE");
    console.log("=============================================\n");
}

runAll();
