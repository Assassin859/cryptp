export interface SourceLocation {
  offset: number;
  length: number;
  fileIndex: number;
  jumpType: string;
}

export interface LineMap {
  line: number;
  column: number;
}

/**
 * Parses a standard Solidity source map string into an array of SourceLocations.
 * Format: s:l:f:j;s:l:f:j...
 * Missing parts inherit from the previous instruction.
 */
export function parseSourceMap(sourceMapStr: string): SourceLocation[] {
  if (!sourceMapStr) return [];

  const parts = sourceMapStr.split(';');
  const result: SourceLocation[] = [];

  let lastOffset = -1;
  let lastLength = -1;
  let lastFileIndex = -1;
  let lastJumpType = '';

  for (const part of parts) {
    const segments = part.split(':');
    
    if (segments.length > 0 && segments[0] !== '') lastOffset = parseInt(segments[0], 10);
    if (segments.length > 1 && segments[1] !== '') lastLength = parseInt(segments[1], 10);
    if (segments.length > 2 && segments[2] !== '') lastFileIndex = parseInt(segments[2], 10);
    if (segments.length > 3 && segments[3] !== '') lastJumpType = segments[3];

    result.push({
      offset: lastOffset,
      length: lastLength,
      fileIndex: lastFileIndex,
      jumpType: lastJumpType,
    });
  }

  return result;
}

/**
 * Maps byte offsets to line/column numbers in the source code.
 */
export function offsetToLineColumn(sourceCode: string, offset: number): LineMap {
  const lines = sourceCode.substring(0, offset).split('\n');
  return {
    line: lines.length, // 1-indexed
    column: lines[lines.length - 1].length + 1, // 1-indexed
  };
}

/**
 * Correlates EVM execution traces to source lines using accurate PC-to-Instruction mapping.
 */
export function mapTraceToLines(trace: any, sourceMap: SourceLocation[], sourceCode: string, bytecode?: string): Map<number, number> {
  const lineGasMap = new Map<number, number>();

  if (!trace || !trace.structLogs || !sourceMap || sourceMap.length === 0) {
    return lineGasMap;
  }

  // 1. Build an index map: Bytecode Offset (PC) -> Instruction Index
  // This is required because Source Maps refer to instruction indices, 
  // while traces refer to byte offsets (PC).
  const pcToIndexMap = new Map<number, number>();
  
  if (bytecode) {
    const code = hexToBytes(bytecode.startsWith('0x') ? bytecode : '0x' + bytecode);
    let instructionIndex = 0;
    for (let pc = 0; pc < code.length; ) {
      pcToIndexMap.set(pc, instructionIndex);
      const opcode = code[pc];
      // PUSH1 (0x60) to PUSH32 (0x7f)
      if (opcode >= 0x60 && opcode <= 0x7f) {
        pc += (opcode - 0x60) + 2;
      } else {
        pc++;
      }
      instructionIndex++;
    }
  } else {
    // Fallback: Infer from trace PC increments if bytecode isn't available
    // (Less accurate for unexecuted paths but works for the current trace)
    let lastPc = -1;
    let instructionIndex = 0;
    trace.structLogs.forEach((log: any) => {
      if (log.pc !== lastPc) {
        pcToIndexMap.set(log.pc, instructionIndex++);
        lastPc = log.pc;
      }
    });
  }

  // 2. Map executed steps to source lines
  trace.structLogs.forEach((log: any) => {
    const instIndex = pcToIndexMap.get(log.pc);
    if (instIndex !== undefined) {
      const mappedLoc = sourceMap[instIndex];
      
      if (mappedLoc && mappedLoc.offset !== -1 && mappedLoc.fileIndex !== -1) {
        const lineMap = offsetToLineColumn(sourceCode, mappedLoc.offset);
        const currentGas = lineGasMap.get(lineMap.line) || 0;
        lineGasMap.set(lineMap.line, currentGas + log.gasCost);
      }
    }
  });

  return lineGasMap;
}

/**
 * Helper to convert hex to bytes (re-implemented here to keep traceMapper lean)
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let i = 2, j = 0; i < hex.length; i += 2, j++) {
    bytes[j] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
