import { mapTraceToLines } from './src/utils/traceMapper.ts';

// Mock data: 
// Bytecode: 6080604052 (PUSH1 0x80, PUSH1 0x40, MSTORE)
// PC indices: 0, 2, 4
const bytecode = '0x6080604052';
const sourceMap = [
  { offset: 0, length: 1, fileIndex: 0, jumpType: '-' }, // PUSH1
  { offset: 2, length: 1, fileIndex: 0, jumpType: '-' }, // PUSH1
  { offset: 4, length: 1, fileIndex: 0, jumpType: '-' }  // MSTORE
];

const trace = {
  structLogs: [
    { pc: 0, gasCost: 3 },
    { pc: 2, gasCost: 3 },
    { pc: 4, gasCost: 12 }
  ]
};

const sourceCode = "contract Test { }";

const result = mapTraceToLines(trace, sourceMap, sourceCode, bytecode);
console.log('Resulting Line Gas Map:', Array.from(result.entries()));

if (result.size > 0) {
  console.log('Verification Success: Mapping produced gas entries.');
} else {
  console.log('Verification Failure: No gas entries produced.');
}
