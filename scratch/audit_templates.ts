import { scanContract } from '../src/utils/securityScanner';
import { generateTokenCode } from '../src/utils/tokenGenerator';
import { allTemplates } from '../src/utils/contractTemplates';

const audit = (name, code) => {
  const result = scanContract(code);
  console.log(`--- Audit: ${name} ---`);
  console.log(`Score: ${result.score}`);
  if (result.score < 100) {
    console.log(`  ❌ FAIL: Score is ${result.score}`);
    result.findings.forEach(f => {
      console.log(`    [${f.severity}] ${f.title}: ${f.description}`);
    });
  } else {
    console.log(`  ✅ PASS: 100/100`);
  }
};

// 1. Audit Static Templates
console.log('AUDITING STATIC TEMPLATES...');
allTemplates.forEach(t => audit(t.name, t.code));

// 2. Audit Generator Combinations (Gold Standard)
console.log('\nAUDITING GENERATOR (GOLD STANDARD)...');
audit('Gold Standard ERC20', generateTokenCode({
  type: 'ERC20', name: 'Gold', symbol: 'GLD', supply: '1000',
  accessControl: 'Roles', features: { mintable: true, burnable: true, permit: true, capped: true, pausable: true, votes: true, supply: true, enumerable: false, uriStorage: false, flashMinting: false }
}));

audit('DAO Core ERC20', generateTokenCode({
  type: 'ERC20', name: 'DAO', symbol: 'DAO',
  accessControl: 'Roles', features: { mintable: true, votes: true, permit: true, pausable: false, burnable: false, capped: false, flashMinting: false, supply: false, enumerable: false, uriStorage: false }
}));

audit('Mass Mint NFT (ERC721A)', generateTokenCode({
  type: 'ERC721A', name: 'NFT', symbol: 'NFT',
  accessControl: 'Roles', features: { mintable: true, burnable: true, pausable: false, supply: false, enumerable: false, uriStorage: false, flashMinting: false, votes: false, permit: false, capped: false }
}));
